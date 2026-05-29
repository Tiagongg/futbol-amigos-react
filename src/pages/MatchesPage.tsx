import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import { MATCH_FORMAT_LABEL } from '../types/models';
import { totalGoalsClara, totalGoalsOscura } from '../types/models';

export function MatchesPage() {
  const team = useTeam();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<string | null>(null);

  const finalized = team.savedMatches.filter((m) => m.isFinalized).length;
  const matchToDelete = confirmDeleteMatchId
    ? team.getSavedMatch(confirmDeleteMatchId)
    : undefined;

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
          onClick={() => setConfirmDeleteAll(true)}
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
              <Link
                to={`/matches/${match.id}`}
                state={{ from: '/matches' }}
                className="match-card"
              >
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
                  aria-label="Eliminar partido"
                  onClick={() => setConfirmDeleteMatchId(match.id)}
                >
                  🗑
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {confirmDeleteAll ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>¿Borrar todos tus partidos?</h3>
            <p>
              Se eliminarán solo los partidos que hayas creado vos. Los de otros integrantes
              del torneo no se tocan. Esta acción no se puede deshacer.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  team.clearAllSavedMatches();
                  setConfirmDeleteAll(false);
                }}
              >
                Sí, borrar mis partidos
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteAll(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteMatchId && matchToDelete ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>¿Eliminar este partido?</h3>
            <p>
              Se borrará el partido de {MATCH_FORMAT_LABEL[matchToDelete.matchFormat]} del{' '}
              {formatMatchDate(matchToDelete.createdAtMillis)}
              {matchToDelete.isFinalized
                ? ` (${totalGoalsOscura(matchToDelete)} - ${totalGoalsClara(matchToDelete)})`
                : ' (en curso)'}
              . Los demás integrantes del torneo dejarán de verlo.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  team.deleteSavedMatch(confirmDeleteMatchId);
                  setConfirmDeleteMatchId(null);
                }}
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteMatchId(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
