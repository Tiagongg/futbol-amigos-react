import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { TEAM_NAMES } from '../types/models';

export function TeamsPage() {
  const team = useTeam();
  const navigate = useNavigate();
  const [swapId, setSwapId] = useState<string | null>(null);

  const teams = team.balancedTeams;
  if (!teams) {
    navigate('/');
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
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={team.balanceTeamsAction}>
            Rebalancear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              const id = team.saveCurrentTeamsAsMatch();
              if (id) navigate(`/matches/${id}`);
            }}
          >
            Guardar partido
          </button>
        </>
      }
    >
      <ToastMessages />
      <p className="hint swap-hint">
        Tocá un jugador de cada equipo para intercambiarlos.
      </p>
      <div className="teams-grid">
        {renderColumn(TEAM_NAMES.OSCURA, teams.teamOscura, teams.totalOscura, 'oscura')}
        {renderColumn(TEAM_NAMES.CLARA, teams.teamClara, teams.totalClara, 'clara')}
      </div>
    </AppShell>
  );
}
