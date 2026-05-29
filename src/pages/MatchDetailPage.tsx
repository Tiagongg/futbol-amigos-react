import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import {
  goalsFor,
  matchUserLabel,
  TEAM_NAMES,
  teamClara,
  teamOscura,
  totalGoalsClara,
  totalGoalsOscura,
} from '../types/models';

export function MatchDetailPage() {
  const { matchId } = useParams();
  const team = useTeam();
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const match = matchId ? team.getSavedMatch(matchId) : undefined;
  if (!match) {
    return (
      <AppShell title="Partido" backTo="/matches">
        <p className="hint">Partido no encontrado.</p>
      </AppShell>
    );
  }

  const canEdit = team.canManageMatchById(match.id);
  const readOnly = match.isFinalized || !canEdit;

  const renderTeam = (
    title: string,
    entries: ReturnType<typeof teamOscura>,
    variant: 'oscura' | 'clara',
  ) => (
    <section className={`match-team team-${variant}`}>
      <h2>{title}</h2>
      <ul>
        {entries.map((entry) => {
          const goals = goalsFor(match, entry.playerId);
          return (
            <li key={entry.playerId} className="goal-row">
              <PlayerAvatar name={entry.name} imageUri={entry.imageUri} size={40} />
              <div className="goal-row-info">
                <strong>{entry.name}</strong>
                <span className="meta">Nivel {entry.skillScore}</span>
              </div>
              {readOnly ? (
                <span className="goal-count">{goals}</span>
              ) : (
                <div className="goal-controls">
                  <button
                    type="button"
                    onClick={() =>
                      team.updateMatchPlayerGoals(
                        match.id,
                        entry.playerId,
                        Math.max(0, goals - 1),
                      )
                    }
                  >
                    −
                  </button>
                  <span>{goals}</span>
                  <button
                    type="button"
                    onClick={() =>
                      team.updateMatchPlayerGoals(match.id, entry.playerId, goals + 1)
                    }
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <AppShell
      title={match.isFinalized ? 'Partido finalizado' : 'Goles del partido'}
      subtitle={formatMatchDate(match.createdAtMillis)}
      backTo="/matches"
    >
      <ToastMessages />

      <div className="match-scoreboard">
        <span>{TEAM_NAMES.OSCURA}</span>
        <strong>
          {match.isFinalized
            ? `${totalGoalsOscura(match)} - ${totalGoalsClara(match)}`
            : 'En curso'}
        </strong>
        <span>{TEAM_NAMES.CLARA}</span>
      </div>

      <p className="meta audit">
        Creado por {matchUserLabel(match.createdBy)}
        {match.finalizedBy
          ? ` · Finalizado por ${matchUserLabel(match.finalizedBy)}`
          : ''}
      </p>

      {!canEdit && !match.isFinalized ? (
        <p className="banner banner-error">
          Solo quien creó el partido puede cargar goles o finalizarlo.
        </p>
      ) : null}

      <div className="match-teams-grid">
        {renderTeam(TEAM_NAMES.OSCURA, teamOscura(match), 'oscura')}
        {renderTeam(TEAM_NAMES.CLARA, teamClara(match), 'clara')}
      </div>

      {canEdit && !match.isFinalized ? (
        <button
          type="button"
          className="btn btn-primary full-width"
          onClick={() => setConfirmFinalize(true)}
        >
          Guardar resultado (finalizar)
        </button>
      ) : null}

      {confirmFinalize ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Guardar resultado</h3>
            <p>
              El marcador y los goles quedarán fijos y sumarán en la tabla de
              goleadores. ¿Confirmás?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  team.finalizeMatch(match.id);
                  setConfirmFinalize(false);
                }}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmFinalize(false)}
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
