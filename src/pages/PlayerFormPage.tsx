import { FormEvent, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import { formatPlayerName } from '../lib/nameFormat';
import type { Player } from '../types/models';

export function PlayerFormPage() {
  const { playerId } = useParams();
  const isNew = !playerId || playerId === 'new';
  const team = useTeam();
  const navigate = useNavigate();
  const existing = isNew ? undefined : team.getPlayer(playerId!);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(existing?.name ?? '');
  const [score, setScore] = useState(existing?.score ?? 5);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [imageUri, setImageUri] = useState<string | null | undefined>(
    existing?.imageUri,
  );
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isNew && !existing) {
    return (
      <AppShell title="Jugador" backTo="/">
        <p className="hint">Jugador no encontrado.</p>
      </AppShell>
    );
  }

  const id = existing?.id ?? crypto.randomUUID();

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUri(url);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = formatPlayerName(name);
    if (!trimmed) {
      setLocalError('El nombre no puede estar vacío');
      return;
    }
    if (score < 1 || score > 10) {
      setLocalError('El puntaje debe estar entre 1 y 10');
      return;
    }
    setSaving(true);
    setLocalError(null);
    const player: Player = {
      id,
      name: trimmed,
      score,
      description: description.trim(),
      imageUri: imageUri ?? null,
    };
    const ok = await team.savePlayer(player, isNew);
    setSaving(false);
    if (ok) navigate('/');
  };

  return (
    <AppShell title={isNew ? 'Nuevo jugador' : 'Editar jugador'} backTo="/">
      <form className="form player-form" onSubmit={onSubmit}>
        {localError ? <p className="banner banner-error">{localError}</p> : null}
        <div className="photo-picker">
          <button
            type="button"
            className="avatar-btn"
            onClick={() => fileRef.current?.click()}
          >
            <PlayerAvatar name={name || '?'} imageUri={imageUri} size={96} />
            <span>Cambiar foto</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </div>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Nivel: {score}
          <input
            type="range"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
          />
        </label>
        <label>
          Descripción (opcional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </AppShell>
  );
}
