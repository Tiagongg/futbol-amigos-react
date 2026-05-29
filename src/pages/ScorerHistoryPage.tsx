import { useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import { MATCH_FORMAT_LABEL, type MatchFormat } from '../types/models';

export function ScorerHistoryPage() {
  const { format: formatParam, playerId } = useParams();
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
          {standing.totalGoals} goles en {standing.matchesPlayed} partidos
        </p>
      </div>
      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.matchId}>
            <strong>{entry.goals} goles</strong>
            <span className="meta">{formatMatchDate(entry.matchDateMillis)}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
