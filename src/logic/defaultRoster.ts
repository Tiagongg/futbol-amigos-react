import { formatPlayerName } from '../lib/nameFormat';
import type { Player } from '../types/models';

export const DEFAULT_ROSTER_VERSION = 3;

const ROSTER: [string, number][] = [
  ['Alu', 8],
  ['Lago', 9],
  ['Vig', 7],
  ['Axel', 4],
  ['Nahue', 3],
  ['Tiago', 6],
  ['Telmo', 4],
  ['Lucas', 8],
  ['Cabre', 6],
  ['Ingiu', 6],
  ['Rasey', 4],
  ['Regni', 6],
  ['Cati', 6],
  ['Bun', 6],
  ['Joaco', 7],
  ['Delga', 3],
  ['Juli', 7],
];

export function defaultRosterPlayers(): Player[] {
  return ROSTER.map(([name, score]) => ({
    id: crypto.randomUUID(),
    name: formatPlayerName(name),
    score,
    description: '',
  }));
}
