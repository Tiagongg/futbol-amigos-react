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
import { LEGACY } from '../lib/firestoreConstants';
import { joinByInviteCode, loadUserProfile } from './tournamentService';

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

function inviteCodeRef(code: string) {
  return doc(db, COLLECTIONS.inviteCodes, code);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function currentUserEmail(): string {
  return normalizeEmail(auth.currentUser?.email ?? '');
}

/** Guarda el correo en cada torneo donde sos miembro (arregla registros viejos). */
export async function ensureMyMemberEmails(): Promise<void> {
  const uid = requireUid();
  const email = currentUserEmail();
  if (!email) return;

  const profile = await loadUserProfile();
  await Promise.all(
    profile.tournamentIds.map(async (tournamentId) => {
      const ref = memberRef(tournamentId, uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const stored = (snap.data()[FIELDS.email] as string) || '';
      if (normalizeEmail(stored) === email) return;
      await setDoc(ref, { [FIELDS.email]: email }, { merge: true });
    }),
  );
}

async function resolveMemberEmail(
  tournamentId: string,
  memberUid: string,
  storedEmail: string,
  creatorCanBackfill: boolean,
): Promise<string> {
  if (storedEmail.trim()) return normalizeEmail(storedEmail);

  try {
    const userSnap = await getDoc(userRef(memberUid));
    if (!userSnap.exists()) return '';
    const fromUser = normalizeEmail((userSnap.data()[FIELDS.email] as string) || '');
    if (!fromUser) return '';

    if (creatorCanBackfill) {
      await setDoc(
        memberRef(tournamentId, memberUid),
        { [FIELDS.email]: fromUser },
        { merge: true },
      );
    }
    return fromUser;
  } catch {
    return '';
  }
}

export async function getTournamentCreatedBy(tournamentId: string): Promise<string> {
  const snap = await getDoc(tournamentRef(tournamentId));
  if (!snap.exists()) return '';
  return (snap.data()[FIELDS.createdBy] as string) || '';
}

export async function canManageTournament(tournamentId: string): Promise<boolean> {
  const uid = requireUid();
  const createdBy = await getTournamentCreatedBy(tournamentId);
  if (createdBy === uid) return true;
  const memberSnap = await getDoc(memberRef(tournamentId, uid));
  if (!memberSnap.exists()) return false;
  return (memberSnap.data()[FIELDS.role] as string) === ROLES.admin;
}

/** Alias: creador del doc o rol admin en members. */
export async function isTournamentCreator(tournamentId: string): Promise<boolean> {
  return canManageTournament(tournamentId);
}

/**
 * Torneo principal `futbol-amigos-2026`: asegura membresía y creadoría para el dueño legacy.
 */
export async function ensureLegacyTournamentOwner(): Promise<void> {
  const email = currentUserEmail();
  if (email !== normalizeEmail(LEGACY.ownerEmail)) return;

  const uid = requireUid();
  const tournamentId = LEGACY.tournamentId;
  let memberSnap = await getDoc(memberRef(tournamentId, uid));

  if (!memberSnap.exists()) {
    try {
      await joinByInviteCode(LEGACY.inviteCode);
      memberSnap = await getDoc(memberRef(tournamentId, uid));
    } catch {
      return;
    }
  }

  if (!memberSnap.exists()) return;

  const tSnap = await getDoc(tournamentRef(tournamentId));
  if (!tSnap.exists()) return;

  const createdBy = (tSnap.data()[FIELDS.createdBy] as string) || '';
  const memberPatch: Record<string, unknown> = {
    [FIELDS.role]: ROLES.admin,
    [FIELDS.email]: email,
  };
  if (!memberSnap.data()[FIELDS.joinedAt]) {
    memberPatch[FIELDS.joinedAt] = Date.now();
  }
  await setDoc(memberRef(tournamentId, uid), memberPatch, { merge: true });

  if (createdBy !== uid) {
    await setDoc(tournamentRef(tournamentId), { [FIELDS.createdBy]: uid }, { merge: true });
  }
}

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
  if (!(await canManageTournament(tournamentId))) {
    throw new Error('Solo el creador del torneo puede ver la lista de integrantes');
  }
  const creatorCanBackfill = true;
  const snap = await getDocs(membersCollection(tournamentId));

  const members = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      const stored = (data[FIELDS.email] as string) || '';
      const email = await resolveMemberEmail(
        tournamentId,
        d.id,
        stored,
        creatorCanBackfill,
      );
      let displayLabel = email;
      if (!displayLabel) {
        try {
          const userSnap = await getDoc(userRef(d.id));
          displayLabel =
            (userSnap.data()?.[FIELDS.displayName] as string) ||
            `Usuario ${d.id.slice(0, 8)}`;
        } catch {
          displayLabel = `Usuario ${d.id.slice(0, 8)}`;
        }
      }
      return {
        uid: d.id,
        email,
        displayLabel,
        role: (data[FIELDS.role] as string) || ROLES.member,
        joinedAt: (data[FIELDS.joinedAt] as number) || 0,
      };
    }),
  );

  return members.sort((a, b) => {
    const ea = a.email || a.uid;
    const eb = b.email || b.uid;
    return ea.localeCompare(eb, 'es');
  });
}

async function removeMemberFromTournament(
  tournamentId: string,
  targetUid: string,
): Promise<void> {
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
    // El miembro ya no puede entrar al torneo aunque su lista tarde en actualizarse.
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

/** Solo el creador: borra el torneo, miembros y código de invitación. */
export async function deleteTournament(tournamentId: string): Promise<void> {
  const uid = requireUid();
  if (tournamentId === LEGACY.tournamentId) {
    throw new Error('El torneo principal (futbol-amigos-2026) no se puede eliminar desde la app');
  }
  if (!(await canManageTournament(tournamentId))) {
    throw new Error('Solo el creador puede eliminar el torneo');
  }

  const tSnap = await getDoc(tournamentRef(tournamentId));
  if (!tSnap.exists()) throw new Error('El torneo ya no existe');

  const inviteCode = (tSnap.data()[FIELDS.inviteCode] as string) || '';
  const membersSnap = await getDocs(membersCollection(tournamentId));

  const batch = writeBatch(db);
  for (const memberDoc of membersSnap.docs) {
    batch.delete(memberDoc.ref);
  }
  batch.delete(tournamentRef(tournamentId));
  await batch.commit();

  if (inviteCode) {
    try {
      await deleteDoc(inviteCodeRef(inviteCode));
    } catch {
      // Código ya borrado o sin permiso puntual
    }
  }

  const profile = await loadUserProfile();
  const remaining = profile.tournamentIds.filter((id) => id !== tournamentId);
  const updates: Record<string, unknown> = {
    [FIELDS.tournamentIds]: remaining,
  };
  if (profile.activeTournamentId === tournamentId) {
    updates[FIELDS.activeTournamentId] = remaining[0] ?? null;
  }
  await setDoc(userRef(uid), updates, { merge: true });
}
