import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import {
  goalsFor,
  matchHasAnyGoals,
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
  const [editRoster, setEditRoster] = useState(false);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [pendingGoalPlayerId, setPendingGoalPlayerId] = useState<string | null>(null);

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
  const hasGoals = matchHasAnyGoals(match);
  const canEditRoster = canEdit && !match.isFinalized && !hasGoals;

  const onPlayerTapForSwap = (playerId: string, inOscura: boolean) => {
    if (!canEditRoster) return;
    if (!swapId) {
      setSwapId(playerId);
      return;
    }
    if (swapId === playerId) {
      setSwapId(null);
      return;
    }
    const oscuraIds = teamOscura(match).map((e) => e.playerId);
    const selectedInOscura = oscuraIds.includes(swapId);
    if (selectedInOscura === inOscura) {
      setSwapId(playerId);
    } else {
      team.swapMatchRosterPlayers(match.id, swapId, playerId);
      setSwapId(null);
    }
  };

  const tryIncreaseGoal = (playerId: string, currentGoals: number) => {
    if (!hasGoals && currentGoals === 0) {
      setPendingGoalPlayerId(playerId);
      return;
    }
    team.updateMatchPlayerGoals(match.id, playerId, currentGoals + 1);
  };

  const confirmFirstGoal = () => {
    if (!pendingGoalPlayerId) return;
    team.updateMatchPlayerGoals(match.id, pendingGoalPlayerId, 1);
    setPendingGoalPlayerId(null);
    if (editRoster) setEditRoster(false);
  };

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
          const inOscura = variant === 'oscura';
          const swapMode = editRoster && canEditRoster;

          return (
            <li
              key={entry.playerId}
              className={`goal-row ${swapMode ? 'goal-row-swap' : ''}`}
            >
              {swapMode ? (
                <button
                  type="button"
                  className={`team-player goal-row-swap-btn ${
                    swapId === entry.playerId ? 'swap-selected' : ''
                  }`}
                  onClick={() => onPlayerTapForSwap(entry.playerId, inOscura)}
                >
                  <PlayerAvatar name={entry.name} imageUri={entry.imageUri} size={40} />
                  <div className="goal-row-info">
                    <strong>{entry.name}</strong>
                    <span className="meta">Nivel {entry.skillScore}</span>
                  </div>
                </button>
              ) : (
                <>
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
                        onClick={() => tryIncreaseGoal(entry.playerId, goals)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </>
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

      {canEdit && !match.isFinalized && !hasGoals ? (
        <p className="banner banner-warning">
          Podés modificar los equipos antes de cargar goles. Si sumás goles, la plantilla
          del partido queda fija.
        </p>
      ) : null}

      {canEdit && !match.isFinalized && hasGoals ? (
        <p className="banner banner-info">
          Ya hay goles cargados: no se puede modificar la plantilla de este partido.
        </p>
      ) : null}

      {canEditRoster && !editRoster ? (
        <div className="button-row match-roster-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setEditRoster(true);
              setSwapId(null);
            }}
          >
            Modificar equipos
          </button>
        </div>
      ) : null}

      {editRoster && canEditRoster ? (
        <p className="hint swap-hint">Tocá un jugador de cada equipo para intercambiarlos.</p>
      ) : null}

      <div className="match-teams-grid">
        {renderTeam(TEAM_NAMES.OSCURA, teamOscura(match), 'oscura')}
        {renderTeam(TEAM_NAMES.CLARA, teamClara(match), 'clara')}
      </div>

      {canEdit && !match.isFinalized && editRoster && canEditRoster ? (
        <button
          type="button"
          className="btn btn-primary full-width"
          onClick={() => {
            setEditRoster(false);
            setSwapId(null);
          }}
        >
          Listo · cargar goles
        </button>
      ) : null}

      {canEdit && !match.isFinalized && !editRoster ? (
        <button
          type="button"
          className="btn btn-primary full-width"
          onClick={() => setConfirmFinalize(true)}
        >
          Guardar resultado (finalizar)
        </button>
      ) : null}

      {pendingGoalPlayerId ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>¿Sumar un gol?</h3>
            <p>
              Si cargás goles en este partido, <strong>no vas a poder modificar la plantilla</strong>{' '}
              de los equipos (quién juega en Oscura o Clara).
            </p>
            <div className="button-row">
              <button type="button" className="btn btn-primary" onClick={confirmFirstGoal}>
                Sí, sumar gol
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingGoalPlayerId(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
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
