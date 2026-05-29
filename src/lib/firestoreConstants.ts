export const COLLECTIONS = {
  users: 'users',
  tournaments: 'tournaments',
  members: 'members',
  inviteCodes: 'inviteCodes',
} as const;

export const FIELDS = {
  email: 'email',
  displayName: 'displayName',
  activeTournamentId: 'activeTournamentId',
  tournamentIds: 'tournamentIds',
  createdAt: 'createdAt',
  name: 'name',
  inviteCode: 'inviteCode',
  createdBy: 'createdBy',
  tournamentId: 'tournamentId',
  role: 'role',
  joinedAt: 'joinedAt',
  payload: 'payload',
  updatedAt: 'updatedAt',
} as const;

export const ROLES = {
  admin: 'admin',
  member: 'member',
} as const;

export const LEGACY = {
  tournamentId: 'futbol-amigos-2026',
  inviteCode: 'AMIG2026',
} as const;
