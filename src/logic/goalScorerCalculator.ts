import type {
  GoalScorerStanding,
  MatchFormat,
  PlayerGoalHistoryEntry,
  SavedMatch,
} from '../types/models';
import { goalsFor } from '../types/models';

export function standings(
  matches: SavedMatch[],
  format: MatchFormat,
): GoalScorerStanding[] {
  const accumulator = new Map<
    string,
    {
      playerId: string;
      name: string;
      imageUri?: string | null;
      totalGoals: number;
      matchesPlayed: number;
    }
  >();

  for (const match of matches.filter(
    (m) => m.isFinalized && m.matchFormat === format,
  )) {
    for (const player of match.roster) {
      const g = goalsFor(match, player.playerId);
      if (g <= 0) continue;
      const entry = accumulator.get(player.playerId) ?? {
        playerId: player.playerId,
        name: player.name,
        imageUri: player.imageUri,
        totalGoals: 0,
        matchesPlayed: 0,
      };
      entry.name = player.name;
      entry.imageUri = player.imageUri ?? entry.imageUri;
      entry.totalGoals += g;
      entry.matchesPlayed += 1;
      accumulator.set(player.playerId, entry);
    }
  }

  return [...accumulator.values()]
    .map((e) => ({
      playerId: e.playerId,
      name: e.name,
      imageUri: e.imageUri,
      totalGoals: e.totalGoals,
      matchesPlayed: e.matchesPlayed,
    }))
    .sort(
      (a, b) =>
        b.totalGoals - a.totalGoals || a.name.localeCompare(b.name, 'es'),
    );
}

export function historyForPlayer(
  playerId: string,
  matches: SavedMatch[],
  format: MatchFormat,
): PlayerGoalHistoryEntry[] {
  return matches
    .filter((m) => m.isFinalized && m.matchFormat === format)
    .map((match) => {
      const goals = goalsFor(match, playerId);
      if (goals <= 0) return null;
      const player = match.roster.find((r) => r.playerId === playerId);
      if (!player) return null;
      return {
        matchId: match.id,
        matchDateMillis: match.finalizedAtMillis ?? match.createdAtMillis,
        goals,
        matchFormat: match.matchFormat,
        playerName: player.name,
      };
    })
    .filter((e): e is PlayerGoalHistoryEntry => e !== null)
    .sort((a, b) => b.matchDateMillis - a.matchDateMillis);
}
