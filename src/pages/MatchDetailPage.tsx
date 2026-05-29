import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatMatchDate } from '../lib/dateFormat';
import type { MatchPlayerEntry, SavedMatch } from '../types/models';
import {
  goalsFor,
  matchHasAnyGoals,
  matchUserLabel,
  replaceMatchRosterPlayer,
  rosterPlayerIds,
  swapMatchRoster,
  TEAM_NAMES,
  teamClara,
  teamOscura,
  totalGoalsClara,
  totalGoalsOscura,
} from '../types/models';

function cloneRosterDraft(match: SavedMatch): {
  roster: MatchPlayerEntry[];
  goalsByPlayerId: Record<string, number>;
} {
  return {
    roster: match.roster.map((e) => ({ ...e })),
    goalsByPlayerId: { ...match.goalsByPlayerId },
  };
}

export function MatchDetailPage() {
  const { matchId } = useParams();
  const team = useTeam();
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [editRoster, setEditRoster] = useState(false);
  const [draftRoster, setDraftRoster] = useState<MatchPlayerEntry[] | null>(null);
  const [draftGoals, setDraftGoals] = useState<Record<string, number> | null>(null);
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

  const displayMatch: SavedMatch =
    editRoster && draftRoster
      ? { ...match, roster: draftRoster, goalsByPlayerId: draftGoals ?? match.goalsByPlayerId }
      : match;

  const inMatchIds = rosterPlayerIds(displayMatch);
  const benchPlayers = team.players
    .filter((p) => !inMatchIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const selectedInMatch = swapId
    ? displayMatch.roster.find((e) => e.playerId === swapId)
    : undefined;

  const startEditRoster = () => {
    const draft = cloneRosterDraft(match);
    setDraftRoster(draft.roster);
    setDraftGoals(draft.goalsByPlayerId);
    setEditRoster(true);
    setSwapId(null);
  };

  const discardEditRoster = () => {
    setEditRoster(false);
    setDraftRoster(null);
    setDraftGoals(null);
    setSwapId(null);
  };

  const confirmEditRoster = () => {
    if (!draftRoster || !draftGoals) return;
    team.commitMatchRoster(match.id, draftRoster, draftGoals);
    discardEditRoster();
  };

  const onPlayerTapForSwap = (playerId: string, inOscura: boolean) => {
    if (!canEditRoster || !draftRoster) return;
    if (!swapId) {
      setSwapId(playerId);
      return;
    }
    if (swapId === playerId) {
      setSwapId(null);
      return;
    }
    const oscuraIds = teamOscura(displayMatch).map((e) => e.playerId);
    const selectedInOscura = oscuraIds.includes(swapId);
    if (selectedInOscura === inOscura) {
      setSwapId(playerId);
    } else {
      const roster = swapMatchRoster(draftRoster, swapId, playerId);
      if (roster) setDraftRoster(roster);
      setSwapId(null);
    }
  };

  const onReplaceFromBench = (incomingPlayerId: string) => {
    if (!swapId || !draftRoster || !draftGoals) return;
    const incoming = team.players.find((p) => p.id === incomingPlayerId);
    if (!incoming) return;
    const updated = replaceMatchRosterPlayer(
      draftRoster,
      draftGoals,
      swapId,
      incoming,
    );
    if (updated) {
      setDraftRoster(updated.roster);
      setDraftGoals(updated.goalsByPlayerId);
    }
    setSwapId(null);
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
    discardEditRoster();
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
          const goals = goalsFor(displayMatch, entry.playerId);
          const inOscura = variant === 'oscura';
          const swapMode = editRoster && canEditRoster && draftRoster;

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

      {canEdit && !match.isFinalized && !hasGoals && !editRoster ? (
        <p className="banner banner-warning">
          Podés cambiar equipos o traer jugadores de la plantilla del torneo (bajas de
          último momento) antes de cargar goles. Si sumás goles, la plantilla queda fija.
        </p>
      ) : null}

      {editRoster && canEditRoster ? (
        <p className="banner banner-warning">
          Estás editando en borrador: los cambios <strong>no se guardan</strong> hasta que
          toques «Guardar equipos». Descartar vuelve al estado anterior.
        </p>
      ) : null}

      {canEdit && !match.isFinalized && hasGoals ? (
        <p className="banner banner-info">
          Ya hay goles cargados: no se puede modificar la plantilla de este partido.
        </p>
      ) : null}

      {canEditRoster && !editRoster ? (
        <div className="button-row match-roster-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEditRoster}>
            Modificar equipos
          </button>
        </div>
      ) : null}

      {editRoster && canEditRoster ? (
        <p className="hint swap-hint">
          Tocá un jugador del partido y después otro de otro equipo para intercambiarlos, o
          elegí un suplente de la plantilla para reemplazarlo (baja de último momento).
        </p>
      ) : null}

      <div className="match-teams-grid">
        {renderTeam(TEAM_NAMES.OSCURA, teamOscura(displayMatch), 'oscura')}
        {renderTeam(TEAM_NAMES.CLARA, teamClara(displayMatch), 'clara')}
      </div>

      {editRoster && canEditRoster && swapId && selectedInMatch ? (
        <section className="match-bench">
          <h3>Reemplazar a {selectedInMatch.name}</h3>
          <p className="hint small">
            Equipo {selectedInMatch.team === 'OSCURA' ? TEAM_NAMES.OSCURA : TEAM_NAMES.CLARA}.
            {benchPlayers.length === 0
              ? ' No hay más jugadores en la plantilla del torneo.'
              : ' Tocá quién entra en su lugar.'}
          </p>
          {benchPlayers.length > 0 ? (
            <ul className="player-list match-bench-list">
              {benchPlayers.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="team-player bench-player-btn"
                    onClick={() => onReplaceFromBench(p.id)}
                  >
                    <PlayerAvatar name={p.name} imageUri={p.imageUri} size={36} />
                    <span>{p.name}</span>
                    <span className="meta">Nivel {p.score}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSwapId(null)}
          >
            Cancelar selección
          </button>
        </section>
      ) : null}

      {canEdit && !match.isFinalized && editRoster && canEditRoster ? (
        <div className="button-row match-edit-actions">
          <button type="button" className="btn btn-secondary" onClick={discardEditRoster}>
            Descartar
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmEditRoster}>
            Guardar equipos
          </button>
        </div>
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
