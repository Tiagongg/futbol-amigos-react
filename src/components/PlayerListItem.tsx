import type { MouseEvent } from 'react';
import type { Player } from '../types/models';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerListItemProps {
  player: Player;
  selected: boolean;
  selectable: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PlayerListItem({
  player,
  selected,
  selectable,
  onSelect,
  onEdit,
  onDelete,
}: PlayerListItemProps) {
  const stop = (e: MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <li
      className={`player-item ${selected ? 'selected' : ''} ${selectable ? 'player-item-selectable' : ''}`}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
    >
      <div className="player-main">
        <PlayerAvatar name={player.name} imageUri={player.imageUri} />
        <div className="player-info">
          <strong>{player.name}</strong>
          <span className="meta">Nivel {player.score}</span>
          {player.description ? (
            <span className="meta desc">{player.description}</span>
          ) : null}
        </div>
        <span className={`score-badge ${selected ? 'score-badge-selected' : ''}`}>
          {player.score}
        </span>
      </div>
      <div className="player-actions">
        <button
          type="button"
          className="btn-icon"
          onClick={(e) => stop(e, onEdit)}
          aria-label={`Editar ${player.name}`}
          title="Editar"
        >
          ✏️
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={(e) => stop(e, onDelete)}
          aria-label={`Eliminar ${player.name}`}
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </li>
  );
}
