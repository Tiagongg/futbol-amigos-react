import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { cloudSyncErrorMessage } from '../lib/cloudSyncErrors';
import { COLLECTIONS, FIELDS, ROLES } from '../lib/firestoreConstants';
import type { TournamentInfo, UserProfile } from '../types/models';

function memberEmailForJoin(): string {
  return (auth.currentUser?.email ?? '').trim().toLowerCase();
}

async function syncUserTournamentMemberships(): Promise<void> {
  const uid = requireUid();
  const profile = await loadUserProfile();
  const validIds: string[] = [];
  for (const id of profile.tournamentIds) {
    const memberSnap = await getDoc(memberRef(id, uid));
    if (memberSnap.exists()) validIds.push(id);
  }
  if (validIds.length === profile.tournamentIds.length) return;
  const updates: Record<string, unknown> = { [FIELDS.tournamentIds]: validIds };
  if (
    profile.activeTournamentId &&
    !validIds.includes(profile.activeTournamentId)
  ) {
    updates[FIELDS.activeTournamentId] = validIds[0] ?? null;
  }
  await setDoc(userRef(uid), updates, { merge: true });
}

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

function inviteCodeRef(code: string) {
  return doc(db, COLLECTIONS.inviteCodes, code);
}

function defaultProfile(email: string): UserProfile {
  return {
    email,
    displayName: email.split('@')[0] || '',
    activeTournamentId: null,
    tournamentIds: [],
  };
}

function mapUserProfile(
  data: Record<string, unknown> | undefined,
  fallbackEmail: string,
): UserProfile {
  return {
    email: (data?.[FIELDS.email] as string) || fallbackEmail,
    displayName: (data?.[FIELDS.displayName] as string) || '',
    activeTournamentId: (data?.[FIELDS.activeTournamentId] as string) || null,
    tournamentIds: Array.isArray(data?.[FIELDS.tournamentIds])
      ? (data[FIELDS.tournamentIds] as string[])
      : [],
  };
}

export async function loadUserProfile(): Promise<UserProfile> {
  const uid = requireUid();
  const email = auth.currentUser?.email ?? '';
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) {
    const profile = defaultProfile(email);
    await setDoc(userRef(uid), {
      [FIELDS.email]: profile.email,
      [FIELDS.displayName]: profile.displayName,
      [FIELDS.tournamentIds]: profile.tournamentIds,
      [FIELDS.createdAt]: Date.now(),
    });
    return profile;
  }
  return mapUserProfile(snap.data(), email);
}

export async function updateDisplayName(name: string) {
  const uid = requireUid();
  await setDoc(userRef(uid), { [FIELDS.displayName]: name.trim() }, { merge: true });
}

export async function listMyTournaments(): Promise<TournamentInfo[]> {
  const uid = requireUid();
  await syncUserTournamentMemberships();
  const profile = await loadUserProfile();
  const activeId = profile.activeTournamentId;
  const tournaments: TournamentInfo[] = [];

  for (const id of profile.tournamentIds) {
    const memberSnap = await getDoc(memberRef(id, uid));
    if (!memberSnap.exists()) continue;

    const snap = await getDoc(tournamentRef(id));
    if (!snap.exists()) continue;
    const data = snap.data();
    const createdBy = (data[FIELDS.createdBy] as string) || '';
    const memberData = memberSnap.data();
    const role = (memberData[FIELDS.role] as string) || ROLES.member;
    tournaments.push({
      id,
      name: (data[FIELDS.name] as string) || id,
      inviteCode: (data[FIELDS.inviteCode] as string) || '',
      isActive: id === activeId,
      createdBy,
      isCreator: createdBy === uid || role === ROLES.admin,
    });
  }

  return tournaments;
}

function buildTournamentId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return slug ? `${slug}-${suffix}` : `torneo-${suffix}`;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function addTournamentToUser(uid: string, tournamentId: string, setActive: boolean) {
  const updates: Record<string, unknown> = {
    [FIELDS.tournamentIds]: arrayUnion(tournamentId),
  };
  if (setActive) updates[FIELDS.activeTournamentId] = tournamentId;
  await setDoc(userRef(uid), updates, { merge: true });
}

export async function createTournament(name: string): Promise<TournamentInfo> {
  const uid = requireUid();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('El nombre del torneo no puede estar vacío');

  const tournamentId = buildTournamentId(trimmed);
  const inviteCode = generateInviteCode();
  const batch = writeBatch(db);

  batch.set(tournamentRef(tournamentId), {
    [FIELDS.name]: trimmed,
    [FIELDS.inviteCode]: inviteCode,
    [FIELDS.createdBy]: uid,
    [FIELDS.createdAt]: Date.now(),
  });
  batch.set(memberRef(tournamentId, uid), {
    [FIELDS.role]: ROLES.admin,
    [FIELDS.joinedAt]: Date.now(),
    [FIELDS.email]: memberEmailForJoin(),
  });
  batch.set(inviteCodeRef(inviteCode), {
    [FIELDS.tournamentId]: tournamentId,
    [FIELDS.name]: trimmed,
  });
  await batch.commit();
  await addTournamentToUser(uid, tournamentId, true);

  return { id: tournamentId, name: trimmed, inviteCode, isActive: true };
}

async function tournamentByInviteQuery(code: string): Promise<string | null> {
  const q = query(
    collection(db, COLLECTIONS.tournaments),
    where(FIELDS.inviteCode, '==', code),
    limit(1),
  );
  const result = await getDocs(q);
  return result.docs[0]?.id ?? null;
}

export async function joinByInviteCode(rawCode: string): Promise<TournamentInfo> {
  const uid = requireUid();
  const code = rawCode.trim().toUpperCase().replace(/\s/g, '');
  if (code.length < 4) throw new Error('Código de invitación inválido');

  const lookup = await getDoc(inviteCodeRef(code));
  let tournamentId = lookup.data()?.[FIELDS.tournamentId] as string | undefined;
  if (!tournamentId) {
    tournamentId = (await tournamentByInviteQuery(code)) ?? undefined;
  }
  if (!tournamentId) throw new Error('No existe un torneo con ese código');

  const lookupName = lookup.data()?.[FIELDS.name] as string | undefined;
  let tournamentName = lookupName;
  if (!tournamentName) {
    const tSnap = await getDoc(tournamentRef(tournamentId));
    tournamentName = tSnap.exists()
      ? ((tSnap.data()[FIELDS.name] as string) || tournamentId)
      : tournamentId;
  }

  await setDoc(
    memberRef(tournamentId, uid),
    {
      [FIELDS.role]: ROLES.member,
      [FIELDS.joinedAt]: Date.now(),
      [FIELDS.email]: memberEmailForJoin(),
    },
    { merge: true },
  );
  await addTournamentToUser(uid, tournamentId, true);

  return { id: tournamentId, name: tournamentName, inviteCode: code, isActive: true };
}

export async function setActiveTournament(tournamentId: string) {
  const uid = requireUid();
  const profile = await loadUserProfile();
  if (!profile.tournamentIds.includes(tournamentId)) {
    throw new Error('No pertenecés a ese torneo');
  }
  await setDoc(userRef(uid), { [FIELDS.activeTournamentId]: tournamentId }, { merge: true });
}

export async function safeTournamentAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (e) {
    throw new Error(cloudSyncErrorMessage(e));
  }
}
