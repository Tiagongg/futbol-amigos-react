import type { BalancedTeams, MatchFormat, Player } from '../types/models';
import { playersPerTeam } from '../types/models';

export const MAX_EXTRA_DIFFERENCE = 2;

function* combinations(n: number, k: number): Generator<number[]> {
  const combo = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield [...combo];
    let i = k - 1;
    while (i >= 0 && combo[i] === n - k + i) i--;
    if (i < 0) break;
    combo[i]++;
    for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1;
  }
}

export function balanceTeams(
  players: Player[],
  matchFormat: MatchFormat,
): BalancedTeams {
  const teamSize = playersPerTeam(matchFormat);
  const required = teamSize * 2;
  if (players.length !== required) {
    throw new Error(
      `Se necesitan exactamente ${required} jugadores (tienes ${players.length})`,
    );
  }

  const candidates: { teamOscura: Player[]; difference: number }[] = [];

  for (const indices of combinations(players.length, teamSize)) {
    const teamOscura = indices.map((i) => players[i]);
    const totalOscura = teamOscura.reduce((s, p) => s + p.score, 0);
    const totalClara = players
      .filter((_, index) => !indices.includes(index))
      .reduce((s, p) => s + p.score, 0);
    candidates.push({
      teamOscura,
      difference: Math.abs(totalOscura - totalClara),
    });
  }

  const minDifference = Math.min(...candidates.map((c) => c.difference));
  const viable = candidates.filter(
    (c) => c.difference <= minDifference + MAX_EXTRA_DIFFERENCE,
  );
  const pick = viable[Math.floor(Math.random() * viable.length)];
  const teamClara = players.filter((p) => !pick.teamOscura.includes(p));
  const totalOscura = pick.teamOscura.reduce((s, p) => s + p.score, 0);
  const totalClara = teamClara.reduce((s, p) => s + p.score, 0);

  return {
    matchFormat,
    teamOscura: pick.teamOscura,
    teamClara,
    totalOscura,
    totalClara,
    difference: pick.difference,
  };
}

export function swapPlayersBetweenTeams(
  teams: BalancedTeams,
  playerIdA: string,
  playerIdB: string,
): BalancedTeams | null {
  if (playerIdA === playerIdB) return null;
  const fromOscura =
    teams.teamOscura.find((p) => p.id === playerIdA) ??
    teams.teamOscura.find((p) => p.id === playerIdB);
  const fromClara =
    teams.teamClara.find((p) => p.id === playerIdA) ??
    teams.teamClara.find((p) => p.id === playerIdB);
  if (!fromOscura || !fromClara) return null;

  const newOscura = teams.teamOscura.map((p) =>
    p.id === fromOscura.id ? fromClara : p,
  );
  const newClara = teams.teamClara.map((p) =>
    p.id === fromClara.id ? fromOscura : p,
  );
  const totalOscura = newOscura.reduce((s, p) => s + p.score, 0);
  const totalClara = newClara.reduce((s, p) => s + p.score, 0);
  return {
    ...teams,
    teamOscura: newOscura,
    teamClara: newClara,
    totalOscura,
    totalClara,
    difference: Math.abs(totalOscura - totalClara),
  };
}
