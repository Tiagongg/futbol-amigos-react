import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LEGACY } from '../lib/firestoreConstants';
import { cloudSyncErrorMessage } from '../lib/cloudSyncErrors';
import { DEFAULT_ROSTER_VERSION, defaultRosterPlayers } from '../logic/defaultRoster';
import {
  emptyPersistedData,
  normalizePersistedData,
  parsePersistedPayload,
  type PersistedAppData,
} from '../types/models';
import { COLLECTIONS, FIELDS } from '../lib/firestoreConstants';
import {
  syncMatchPhotosWithPlayers,
  uploadAllPlayerPhotos,
} from './playerPhotoStorage';

export interface TournamentDataState {
  data: PersistedAppData;
  updatedAt: number;
  loading: boolean;
  error: string | null;
}

let skipNextRemote = false;

function tournamentRef(tournamentId: string) {
  return doc(db, COLLECTIONS.tournaments, tournamentId);
}

function seedLegacyIfNeeded(
  tournamentId: string,
  data: PersistedAppData,
): PersistedAppData {
  if (tournamentId !== LEGACY.tournamentId) return data;
  if ((data.rosterVersion ?? 0) >= DEFAULT_ROSTER_VERSION) return data;
  return {
    players: defaultRosterPlayers(),
    selectedPlayerIds: [],
    matchFormat: data.matchFormat,
    rosterVersion: DEFAULT_ROSTER_VERSION,
    savedMatches: data.savedMatches,
  };
}

export async function fetchTournamentData(
  tournamentId: string,
): Promise<PersistedAppData> {
  const snap = await getDoc(tournamentRef(tournamentId));
  if (!snap.exists()) {
    const seeded = seedLegacyIfNeeded(tournamentId, emptyPersistedData());
    if (
      tournamentId === LEGACY.tournamentId &&
      seeded.players.length > 0
    ) {
      await pushTournamentData(tournamentId, seeded);
    }
    return seeded;
  }
  const raw = parsePersistedPayload(snap.data()[FIELDS.payload]);
  const base = raw ?? emptyPersistedData();
  return seedLegacyIfNeeded(tournamentId, base);
}

export function subscribeTournamentData(
  tournamentId: string,
  onChange: (state: TournamentDataState) => void,
): () => void {
  if (!tournamentId) {
    onChange({
      data: emptyPersistedData(),
      updatedAt: 0,
      loading: false,
      error: 'Torneo no seleccionado',
    });
    return () => undefined;
  }

  onChange({
    data: emptyPersistedData(),
    updatedAt: 0,
    loading: true,
    error: null,
  });

  return onSnapshot(
    tournamentRef(tournamentId),
    (snap) => {
      if (skipNextRemote) {
        skipNextRemote = false;
        return;
      }
      if (!snap.exists()) {
        onChange({
          data: emptyPersistedData(),
          updatedAt: 0,
          loading: false,
          error: null,
        });
        return;
      }
      const fields = snap.data();
      const parsed =
        parsePersistedPayload(fields[FIELDS.payload]) ?? emptyPersistedData();
      const data = seedLegacyIfNeeded(tournamentId, parsed);
      onChange({
        data,
        updatedAt: (fields[FIELDS.updatedAt] as number) ?? 0,
        loading: false,
        error: null,
      });
    },
    (err) => {
      onChange({
        data: emptyPersistedData(),
        updatedAt: 0,
        loading: false,
        error: cloudSyncErrorMessage(err),
      });
    },
  );
}

export async function pushTournamentData(
  tournamentId: string,
  data: PersistedAppData,
): Promise<void> {
  skipNextRemote = true;
  const normalized = normalizePersistedData(data);
  await setDoc(
    tournamentRef(tournamentId),
    {
      [FIELDS.payload]: JSON.stringify(normalized),
      [FIELDS.updatedAt]: Date.now(),
    },
    { merge: true },
  );
}

export interface SaveResult {
  success: boolean;
  photoWarning?: string | null;
}

export async function saveTournamentState(
  tournamentId: string,
  data: PersistedAppData,
): Promise<SaveResult> {
  try {
    const { players, warning } = await uploadAllPlayerPhotos(
      tournamentId,
      data.players,
    );
    const matches = syncMatchPhotosWithPlayers(data.savedMatches, players);
    const toSave = normalizePersistedData({
      ...data,
      players,
      savedMatches: matches,
    });
    await pushTournamentData(tournamentId, toSave);
    return { success: true, photoWarning: warning };
  } catch (e) {
    skipNextRemote = false;
    throw new Error(cloudSyncErrorMessage(e));
  }
}
