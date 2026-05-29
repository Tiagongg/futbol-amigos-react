import { Link, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import {
  MATCH_FORMAT_LABEL,
  TEAM_NAMES,
  type MatchFormat,
  type MatchOutcome,
  type PlayerGoalHistoryEntry,
} from '../types/models';

function outcomeLabel(outcome: MatchOutcome): string {
  if (outcome === 'won') return 'Victoria';
  if (outcome === 'lost') return 'Derrota';
  return 'Empate';
}

function HistoryRow({
  entry,
  returnTo,
}: {
  entry: PlayerGoalHistoryEntry;
  returnTo: string;
}) {
  const teamName = entry.team === 'OSCURA' ? TEAM_NAMES.OSCURA : TEAM_NAMES.CLARA;
  return (
    <li>
      <Link
        to={`/matches/${entry.matchId}`}
        state={{ from: returnTo }}
        className="history-match-link"
      >
        <div className="history-match-main">
          <strong>{formatMatchDate(entry.matchDateMillis)}</strong>
          <span className="meta">
            {teamName} · Nivel {entry.skillScore} ·{' '}
            {entry.goals === 1 ? '1 gol' : `${entry.goals} goles`}
          </span>
          <span className="meta">
            Resultado {entry.goalsOscura} – {entry.goalsClara}
          </span>
        </div>
        <span className={`history-outcome history-outcome-${entry.outcome}`}>
          {outcomeLabel(entry.outcome)}
        </span>
      </Link>
    </li>
  );
}

export function ScorerHistoryPage() {
  const { format: formatParam, playerId } = useParams();
  const location = useLocation();
  const team = useTeam();
  const format = formatParam as MatchFormat;
  if (!playerId || !format) return null;

  const standing = team.getScorerStanding(playerId, format);
  const history = team.getPlayerGoalHistory(playerId, format);

  if (!standing) {
    return (
      <AppShell title="Historial" backTo="/scorers">
        <p className="hint">Jugador no encontrado en la tabla.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={standing.name}
      subtitle={`${standing.totalGoals} goles · ${MATCH_FORMAT_LABEL[format]}`}
      backTo="/scorers"
    >
      <div className="scorer-header">
        <PlayerAvatar name={standing.name} imageUri={standing.imageUri} size={72} />
        <p>
          {standing.totalGoals} goles · {standing.matchesWon}{' '}
          {standing.matchesWon === 1 ? 'victoria' : 'victorias'} · {history.length}{' '}
          {history.length === 1 ? 'partido' : 'partidos'}
        </p>
      </div>
      {history.length === 0 ? (
        <p className="hint center">Sin partidos finalizados en este formato.</p>
      ) : (
        <>
          <p className="hint small history-hint">Tocá un partido para ver goles y niveles.</p>
          <ul className="history-list">
            {history.map((entry) => (
              <HistoryRow
                key={entry.matchId}
                entry={entry}
                returnTo={location.pathname}
              />
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
