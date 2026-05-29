import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS, FIELDS, ROLES } from '../lib/firestoreConstants';
import type { TournamentMember } from '../types/models';
import { loadUserProfile } from './tournamentService';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Tenés que iniciar sesión');
  return uid;
}

function userRef(uid: string) {
  return doc(db, COLLECTIONS.users, uid);
}

function tournamentRef(id: string) {
  return doc(db, COLLECTIONS.tournaments, id);
}

function memberRef(tournamentId: string, uid: string) {
  return doc(db, COLLECTIONS.tournaments, tournamentId, COLLECTIONS.members, uid);
}

function membersCollection(tournamentId: string) {
  return collection(db, COLLECTIONS.tournaments, tournamentId, COLLECTIONS.members);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getTournamentCreatedBy(tournamentId: string): Promise<string> {
  const snap = await getDoc(tournamentRef(tournamentId));
  if (!snap.exists()) return '';
  return (snap.data()[FIELDS.createdBy] as string) || '';
}

export async function isTournamentCreator(tournamentId: string): Promise<boolean> {
  const uid = requireUid();
  const createdBy = await getTournamentCreatedBy(tournamentId);
  return createdBy === uid;
}

/** Quita del perfil torneos donde ya no hay documento de miembro. */
export async function syncUserTournamentMemberships(): Promise<void> {
  const uid = requireUid();
  const profile = await loadUserProfile();
  const validIds: string[] = [];

  for (const id of profile.tournamentIds) {
    const memberSnap = await getDoc(memberRef(id, uid));
    if (memberSnap.exists()) validIds.push(id);
  }

  if (validIds.length === profile.tournamentIds.length) return;

  const updates: Record<string, unknown> = {
    [FIELDS.tournamentIds]: validIds,
  };
  if (
    profile.activeTournamentId &&
    !validIds.includes(profile.activeTournamentId)
  ) {
    updates[FIELDS.activeTournamentId] = validIds[0] ?? null;
  }
  await setDoc(userRef(uid), updates, { merge: true });
}

export async function listTournamentMembers(
  tournamentId: string,
): Promise<TournamentMember[]> {
  const snap = await getDocs(membersCollection(tournamentId));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: (data[FIELDS.email] as string) || '',
        role: (data[FIELDS.role] as string) || ROLES.member,
        joinedAt: (data[FIELDS.joinedAt] as number) || 0,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email, 'es'));
}

async function removeMemberFromTournament(
  tournamentId: string,
  targetUid: string,
): Promise<void> {
  const uid = requireUid();
  const memberSnap = await getDoc(memberRef(tournamentId, targetUid));
  if (!memberSnap.exists()) {
    throw new Error('Esa persona no está en el torneo');
  }

  await deleteDoc(memberRef(tournamentId, targetUid));

  const profileSnap = await getDoc(userRef(targetUid));
  if (!profileSnap.exists()) return;

  const data = profileSnap.data();
  const ids = Array.isArray(data[FIELDS.tournamentIds])
    ? (data[FIELDS.tournamentIds] as string[])
    : [];
  if (!ids.includes(tournamentId)) return;

  const activeId = data[FIELDS.activeTournamentId] as string | undefined;
  const updates: Record<string, unknown> = {
    [FIELDS.tournamentIds]: arrayRemove(tournamentId),
  };
  if (activeId === tournamentId) {
    updates[FIELDS.activeTournamentId] = null;
  }

  try {
    await setDoc(userRef(targetUid), updates, { merge: true });
  } catch {
    // Si las reglas no permiten actualizar al otro usuario, el miembro ya no accede al torneo.
  }
}

export async function leaveTournament(tournamentId: string): Promise<void> {
  const uid = requireUid();
  const profile = await loadUserProfile();
  if (!profile.tournamentIds.includes(tournamentId)) {
    throw new Error('No pertenecés a ese torneo');
  }
  await removeMemberFromTournament(tournamentId, uid);
}

export async function removeMemberByEmail(
  tournamentId: string,
  rawEmail: string,
): Promise<void> {
  const uid = requireUid();
  if (!(await isTournamentCreator(tournamentId))) {
    throw new Error('Solo el creador del torneo puede expulsar integrantes');
  }

  const email = normalizeEmail(rawEmail);
  if (!email.includes('@')) {
    throw new Error('Ingresá un correo válido');
  }

  const members = await listTournamentMembers(tournamentId);
  const target = members.find((m) => normalizeEmail(m.email) === email);
  if (!target) {
    throw new Error('No hay ningún integrante con ese correo en este torneo');
  }

  if (target.uid === uid) {
    throw new Error('Para salir vos del torneo usá «Salir del torneo»');
  }

  await removeMemberFromTournament(tournamentId, target.uid);
}
