import type { Player, SavedMatch } from '../types/models';

const LOCAL_PREFIX = 'amiguis-local-photo:';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function isCloudUrl(uri: string): boolean {
  return uri.startsWith('https://') || uri.startsWith('http://');
}

export function isLocalPhotoRef(uri: string): boolean {
  return uri.startsWith(LOCAL_PREFIX);
}

export function storeLocalPhoto(playerId: string, blob: Blob): string {
  const key = `${LOCAL_PREFIX}${playerId}`;
  const reader = new FileReader();
  // sync via data URL stored in session - use object URL for display
  const objectUrl = URL.createObjectURL(blob);
  sessionStorage.setItem(key, objectUrl);
  return objectUrl;
}

export async function blobFromImageUri(uri: string): Promise<Blob | null> {
  if (!uri || isCloudUrl(uri)) return null;
  try {
    const res = await fetch(uri);
    return await res.blob();
  } catch {
    return null;
  }
}

async function uploadPlayerPhoto(
  tournamentId: string,
  playerId: string,
  blob: Blob,
): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Faltan variables de Cloudinary en .env.local: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET',
    );
  }
  const formData = new FormData();
  formData.append('file', blob, `${playerId}.jpg`);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('context', `tournamentId=${tournamentId}|playerId=${playerId}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`);
  }
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

export async function uploadPlayerPhotoIfNeeded(
  tournamentId: string,
  player: Player,
): Promise<Player> {
  const uri = player.imageUri;
  if (!uri || isCloudUrl(uri)) return player;
  const blob = await blobFromImageUri(uri);
  if (!blob) return player;
  const downloadUrl = await uploadPlayerPhoto(tournamentId, player.id, blob);
  return { ...player, imageUri: downloadUrl };
}

export async function uploadAllPlayerPhotos(
  tournamentId: string,
  players: Player[],
  onPhotoError?: (error: unknown) => void,
): Promise<{ players: Player[]; warning: string | null }> {
  let warning: string | null = null;
  const updated = await Promise.all(
    players.map(async (player) => {
      try {
        return await uploadPlayerPhotoIfNeeded(tournamentId, player);
      } catch (e) {
        onPhotoError?.(e);
        if (!warning) {
          warning =
            'Algunas fotos no se subieron. Verificá la configuración de Cloudinary.';
        }
        return player;
      }
    }),
  );
  return { players: updated, warning };
}

export function syncMatchPhotosWithPlayers(
  savedMatches: SavedMatch[],
  players: Player[],
): SavedMatch[] {
  const photoByPlayerId = new Map(
    players
      .filter((p) => p.imageUri && isCloudUrl(p.imageUri))
      .map((p) => [p.id, p.imageUri!]),
  );
  return savedMatches.map((match) => ({
    ...match,
    roster: match.roster.map((entry) => {
      const cloudUrl = photoByPlayerId.get(entry.playerId);
      return cloudUrl ? { ...entry, imageUri: cloudUrl } : entry;
    }),
  }));
}
