import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { TEAM_NAMES } from '../types/models';

export function TeamsPage() {
  const team = useTeam();
  const navigate = useNavigate();
  const [swapId, setSwapId] = useState<string | null>(null);
  const [confirmRebalance, setConfirmRebalance] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const teams = team.balancedTeams;

  useEffect(() => {
    if (!team.balancedTeams) {
      navigate('/', { replace: true });
    }
  }, [team.balancedTeams, navigate]);

  if (!teams) {
    return null;
  }

  const onPlayerTap = (playerId: string, inOscura: boolean) => {
    if (!swapId) {
      setSwapId(playerId);
      return;
    }
    if (swapId === playerId) {
      setSwapId(null);
      return;
    }
    const selectedInOscura = teams.teamOscura.some((p) => p.id === swapId);
    if (selectedInOscura === inOscura) {
      setSwapId(playerId);
    } else {
      team.swapBalancedPlayers(swapId, playerId);
      setSwapId(null);
    }
  };

  const renderColumn = (
    title: string,
    players: typeof teams.teamOscura,
    total: number,
    variant: 'oscura' | 'clara',
  ) => (
    <div className={`team-column team-${variant}`}>
      <h2>{title}</h2>
      <p className="team-total">Total: {total}</p>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`team-player ${swapId === p.id ? 'swap-selected' : ''}`}
              onClick={() => onPlayerTap(p.id, variant === 'oscura')}
            >
              <PlayerAvatar name={p.name} imageUri={p.imageUri} size={36} />
              <span>{p.name}</span>
              <span className="meta">{p.score}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <AppShell
      title="Equipos"
      subtitle={`Diferencia: ${teams.difference} pts`}
      backTo="/"
    >
      <ToastMessages />
      <p className="hint swap-hint">
        Tocá un jugador de cada equipo para intercambiarlos.
      </p>
      <div className="teams-grid">
        {renderColumn(TEAM_NAMES.OSCURA, teams.teamOscura, teams.totalOscura, 'oscura')}
        {renderColumn(TEAM_NAMES.CLARA, teams.teamClara, teams.totalClara, 'clara')}
      </div>
      <div className="page-bottom-actions">
        <button
          type="button"
          className="btn btn-secondary full-width"
          onClick={() => setConfirmRebalance(true)}
        >
          Rebalancear
        </button>
        <button
          type="button"
          className="btn btn-primary full-width"
          onClick={() => setConfirmSave(true)}
        >
          Guardar partido
        </button>
      </div>

      {confirmRebalance ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>¿Rebalancear equipos?</h3>
            <p>
              Se van a armar de nuevo las formaciones Oscura y Clara según el nivel de los
              jugadores. Se pierden los intercambios manuales que hayas hecho.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  team.balanceTeamsAction();
                  setSwapId(null);
                  setConfirmRebalance(false);
                }}
              >
                Sí, rebalancear
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmRebalance(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSave ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>¿Guardar partido?</h3>
            <p>
              Se creará el partido con estos equipos y podrás cargar los goles. Los demás
              integrantes del torneo lo verán en la nube.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const id = team.saveCurrentTeamsAsMatch();
                  setConfirmSave(false);
                  if (id) {
                    navigate(`/matches/${id}`, { replace: true });
                  }
                }}
              >
                Sí, guardar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmSave(false)}
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
