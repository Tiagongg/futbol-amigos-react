import { Link } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import { MATCH_FORMAT_LABEL } from '../types/models';
import { totalGoalsClara, totalGoalsOscura } from '../types/models';

export function MatchesPage() {
  const team = useTeam();
  const finalized = team.savedMatches.filter((m) => m.isFinalized).length;

  return (
    <AppShell
      title="Partidos"
      subtitle={`${team.savedMatches.length} guardados · ${finalized} finalizados`}
      backTo="/"
      actions={
        <Link className="btn btn-primary btn-sm" to="/scorers">
          Goleadores
        </Link>
      }
    >
      <ToastMessages />

      {team.savedMatches.length > 0 ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm danger-text"
          onClick={() => {
            if (
              window.confirm(
                '¿Borrar todos los partidos que creaste vos? Los de otros usuarios no se tocan.',
              )
            ) {
              team.clearAllSavedMatches();
            }
          }}
        >
          Borrar mis partidos
        </button>
      ) : null}

      {team.savedMatches.length === 0 ? (
        <p className="hint center">Todavía no hay partidos guardados.</p>
      ) : (
        <ul className="match-list">
          {team.savedMatches.map((match) => (
            <li key={match.id}>
              <Link to={`/matches/${match.id}`} className="match-card">
                <div className="match-card-info">
                  <strong className="match-card-title">
                    {MATCH_FORMAT_LABEL[match.matchFormat]}
                    <span className="match-status">
                      {match.isFinalized ? 'Finalizado' : 'En curso'}
                    </span>
                  </strong>
                  <span className="meta match-card-date">
                    {formatMatchDate(match.createdAtMillis)}
                  </span>
                </div>
                <div className="score-pill">
                  {match.isFinalized
                    ? `${totalGoalsOscura(match)} - ${totalGoalsClara(match)}`
                    : 'Sin cerrar'}
                </div>
              </Link>
              {team.canManageMatchById(match.id) ? (
                <button
                  type="button"
                  className="btn-icon danger"
                  onClick={() => {
                    if (window.confirm('¿Eliminar este partido?')) {
                      team.deleteSavedMatch(match.id);
                    }
                  }}
                >
                  🗑
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
