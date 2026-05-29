export type MatchFormat = 'FIVE_VS_FIVE' | 'SIX_VS_SIX';

export const MATCH_FORMAT_LABEL: Record<MatchFormat, string> = {
  FIVE_VS_FIVE: '5 vs 5',
  SIX_VS_SIX: '6 vs 6',
};

export const MATCH_FORMAT_OPTIONS: MatchFormat[] = ['FIVE_VS_FIVE', 'SIX_VS_SIX'];

export function playersPerTeam(format: MatchFormat): number {
  return format === 'FIVE_VS_FIVE' ? 5 : 6;
}

export function squadSize(format: MatchFormat): number {
  return playersPerTeam(format) * 2;
}

export const TEAM_NAMES = { OSCURA: 'Oscura', CLARA: 'Clara' } as const;

export interface Player {
  id: string;
  name: string;
  score: number;
  imageUri?: string | null;
  description?: string;
}

export type TeamSide = 'OSCURA' | 'CLARA';

export interface MatchPlayerEntry {
  playerId: string;
  name: string;
  skillScore: number;
  imageUri?: string | null;
  team: TeamSide;
}

export interface MatchUserInfo {
  userId?: string;
  email?: string;
  displayName?: string;
}

export interface SavedMatch {
  id: string;
  createdAtMillis: number;
  matchFormat: MatchFormat;
  roster: MatchPlayerEntry[];
  goalsByPlayerId: Record<string, number>;
  isFinalized: boolean;
  finalizedAtMillis?: number | null;
  createdBy: MatchUserInfo;
  finalizedBy?: MatchUserInfo | null;
}

export interface PersistedAppData {
  players: Player[];
  selectedPlayerIds: string[];
  matchFormat: MatchFormat;
  rosterVersion?: number;
  savedMatches: SavedMatch[];
}

export interface UserProfile {
  email: string;
  displayName: string;
  activeTournamentId: string | null;
  tournamentIds: string[];
}

export interface TournamentInfo {
  id: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  isCreator?: boolean;
  createdBy?: string;
}

export interface TournamentMember {
  uid: string;
  email: string;
  /** Correo o nombre visible si aún no hay correo en members/users */
  displayLabel: string;
  role: string;
  joinedAt: number;
}

export interface BalancedTeams {
  matchFormat: MatchFormat;
  teamOscura: Player[];
  teamClara: Player[];
  totalOscura: number;
  totalClara: number;
  difference: number;
}

export interface GoalScorerStanding {
  playerId: string;
  name: string;
  imageUri?: string | null;
  totalGoals: number;
  matchesPlayed: number;
}

export interface PlayerGoalHistoryEntry {
  matchId: string;
  matchDateMillis: number;
  goals: number;
  matchFormat: MatchFormat;
  playerName: string;
}

export function parsePersistedPayload(raw: unknown): PersistedAppData | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedAppData;
    return normalizePersistedData(parsed);
  } catch {
    return null;
  }
}

export function normalizePersistedData(data: PersistedAppData): PersistedAppData {
  return {
    players: data.players ?? [],
    selectedPlayerIds: data.selectedPlayerIds ?? [],
    matchFormat: data.matchFormat ?? 'FIVE_VS_FIVE',
    rosterVersion: data.rosterVersion ?? 0,
    savedMatches: (data.savedMatches ?? []).map((m) => ({
      ...m,
      goalsByPlayerId: m.goalsByPlayerId ?? {},
      isFinalized: m.isFinalized ?? false,
      createdBy: m.createdBy ?? {},
    })),
  };
}

export function emptyPersistedData(): PersistedAppData {
  return {
    players: [],
    selectedPlayerIds: [],
    matchFormat: 'FIVE_VS_FIVE',
    savedMatches: [],
  };
}

export function goalsFor(match: SavedMatch, playerId: string): number {
  return match.goalsByPlayerId[playerId] ?? 0;
}

export function teamOscura(match: SavedMatch): MatchPlayerEntry[] {
  return match.roster.filter((e) => e.team === 'OSCURA');
}

export function teamClara(match: SavedMatch): MatchPlayerEntry[] {
  return match.roster.filter((e) => e.team === 'CLARA');
}

export function totalGoalsOscura(match: SavedMatch): number {
  return teamOscura(match).reduce((s, e) => s + goalsFor(match, e.playerId), 0);
}

export function totalGoalsClara(match: SavedMatch): number {
  return teamClara(match).reduce((s, e) => s + goalsFor(match, e.playerId), 0);
}

export function canManageMatch(match: SavedMatch, userId: string): boolean {
  return Boolean(userId && match.createdBy?.userId === userId);
}

export function matchUserLabel(info?: MatchUserInfo): string {
  if (!info) return 'Sin registrar';
  const name = info.displayName?.trim();
  const email = info.email?.trim();
  if (email && name && name.toLowerCase() !== email.toLowerCase()) {
    return `${name} · ${email}`;
  }
  return email || name || 'Sin registrar';
}
