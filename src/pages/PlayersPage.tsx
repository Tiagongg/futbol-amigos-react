import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell, ToastMessages } from '../components/AppShell';
import { FormatToggle } from '../components/FormatToggle';
import { PlayerListItem } from '../components/PlayerListItem';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { MATCH_FORMAT_LABEL } from '../types/models';

export function PlayersPage() {
  const { userEmail } = useAuth();
  const team = useTeam();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (team.errorMessage) team.clearError();
      if (team.successMessage) team.clearSuccess();
    }, 5000);
    return () => clearTimeout(t);
  }, [team.errorMessage, team.successMessage, team]);

  const progress = team.squadSize
    ? Math.min(1, team.selectedCount / team.squadSize)
    : 0;

  return (
    <AppShell
      title={team.tournamentName || 'Plantilla'}
      subtitle={userEmail}
      showTournamentsLink
      showSignOut
      actions={
        <Link className="btn btn-secondary btn-sm" to="/matches">
          Partidos ({team.savedMatches.length})
        </Link>
      }
    >
      <ToastMessages />

      <div className="toolbar-card">
        <FormatToggle value={team.matchFormat} onChange={team.setMatchFormat} />
        {team.showSelectionMode ? (
          <div className="selection-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span>
              {team.selectedCount}/{team.squadSize} para {MATCH_FORMAT_LABEL[team.matchFormat]}
            </span>
          </div>
        ) : null}
      </div>

      {team.isLoading ? (
        <p className="hint center">Cargando plantilla…</p>
      ) : team.players.length === 0 ? (
        <p className="hint center">
          No hay jugadores. Agregá el primero con el botón de abajo.
        </p>
      ) : (
        <ul className="player-list">
          {team.players.map((player) => (
            <PlayerListItem
              key={player.id}
              player={player}
              selected={team.selectedPlayerIds.has(player.id)}
              selectable={team.showSelectionMode}
              onSelect={() => team.togglePlayerSelection(player.id)}
              onEdit={() => navigate(`/players/${player.id}/edit`)}
              onDelete={() => {
                if (window.confirm(`¿Eliminar a ${player.name}?`)) {
                  team.removePlayer(player.id);
                }
              }}
            />
          ))}
        </ul>
      )}

      <div className="fab-row">
        <Link className="btn btn-secondary" to="/players/new">
          + Jugador
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          disabled={team.showSelectionMode && !team.canBalance}
          onClick={() => {
            if (team.balanceTeamsAction()) navigate('/teams');
          }}
        >
          Armar equipos
        </button>
      </div>
    </AppShell>
  );
}
