import type { BalancedTeams, MatchUserInfo, SavedMatch } from '../types/models';

export function balancedTeamsToSavedMatch(
  teams: BalancedTeams,
  createdBy: MatchUserInfo,
): SavedMatch {
  const entries = [
    ...teams.teamOscura.map((player) => ({
      playerId: player.id,
      name: player.name,
      skillScore: player.score,
      imageUri: player.imageUri,
      team: 'OSCURA' as const,
    })),
    ...teams.teamClara.map((player) => ({
      playerId: player.id,
      name: player.name,
      skillScore: player.score,
      imageUri: player.imageUri,
      team: 'CLARA' as const,
    })),
  ];
  return {
    id: crypto.randomUUID(),
    createdAtMillis: Date.now(),
    matchFormat: teams.matchFormat,
    roster: entries,
    goalsByPlayerId: Object.fromEntries(entries.map((e) => [e.playerId, 0])),
    isFinalized: false,
    createdBy,
  };
}
