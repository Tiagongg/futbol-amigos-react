import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { standings, historyForPlayer } from '../logic/goalScorerCalculator';
import { balancedTeamsToSavedMatch } from '../logic/savedMatch';
import { balanceTeams, swapPlayersBetweenTeams } from '../logic/teamBalancer';
import { resolveCurrentMatchUser } from '../services/matchUser';
import {
  saveTournamentState,
  subscribeTournamentData,
} from '../services/tournamentDataService';
import type {
  BalancedTeams,
  GoalScorerStanding,
  MatchFormat,
  MatchUserInfo,
  PersistedAppData,
  Player,
  PlayerGoalHistoryEntry,
  SavedMatch,
} from '../types/models';
import {
  canManageMatch,
  emptyPersistedData,
  MATCH_FORMAT_LABEL,
  matchHasAnyGoals,
  replaceMatchRosterPlayer as replaceMatchRosterPlayerInMatch,
  squadSize,
  swapMatchRoster,
} from '../types/models';
import { useAuth } from './AuthContext';

interface TeamContextValue {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  players: Player[];
  selectedPlayerIds: Set<string>;
  matchFormat: MatchFormat;
  balancedTeams: BalancedTeams | null;
  savedMatches: SavedMatch[];
  isLoading: boolean;
  isUploading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  syncError: string | null;
  currentMatchUser: MatchUserInfo;
  showSelectionMode: boolean;
  canBalance: boolean;
  selectedCount: number;
  squadSize: number;
  clearError: () => void;
  clearSuccess: () => void;
  clearSyncError: () => void;
  setMatchFormat: (format: MatchFormat) => void;
  togglePlayerSelection: (playerId: string) => void;
  getPlayer: (playerId: string) => Player | undefined;
  savePlayer: (player: Player, isNew: boolean) => Promise<boolean>;
  removePlayer: (playerId: string) => void;
  balanceTeamsAction: () => boolean;
  swapBalancedPlayers: (a: string, b: string) => void;
  saveCurrentTeamsAsMatch: () => string | null;
  getSavedMatch: (matchId: string) => SavedMatch | undefined;
  canManageMatchById: (matchId: string) => boolean;
  updateMatchPlayerGoals: (matchId: string, playerId: string, goals: number) => void;
  swapMatchRosterPlayers: (matchId: string, playerIdA: string, playerIdB: string) => void;
  replaceMatchRosterPlayer: (
    matchId: string,
    outgoingPlayerId: string,
    incomingPlayerId: string,
  ) => void;
  commitMatchRoster: (
    matchId: string,
    roster: SavedMatch['roster'],
    goalsByPlayerId: Record<string, number>,
  ) => void;
  finalizeMatch: (matchId: string) => void;
  deleteSavedMatch: (matchId: string) => void;
  clearAllSavedMatches: () => void;
  getGoalScorerStandings: (format: MatchFormat) => GoalScorerStanding[];
  getPlayerGoalHistory: (playerId: string, format: MatchFormat) => PlayerGoalHistoryEntry[];
  getScorerStanding: (playerId: string, format: MatchFormat) => GoalScorerStanding | undefined;
  finalizedMatchesCount: (format: MatchFormat) => number;
}

const TeamContext = createContext<TeamContextValue | null>(null);

function reconcileSelection(
  players: Player[],
  current: Set<string>,
  format: MatchFormat,
): Set<string> {
  const size = squadSize(format);
  const validIds = new Set(players.map((p) => p.id));
  const ordered = players.map((p) => p.id).filter((id) => current.has(id));
  if (players.length <= size) return validIds;
  if (ordered.length <= size) return new Set(ordered);
  return new Set(ordered.slice(0, size));
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const {
    activeTournamentId,
    tournaments,
    displayName,
    userEmail,
  } = useAuth();

  const activeTournament = tournaments.find((t) => t.id === activeTournamentId);
  const tournamentId = activeTournamentId ?? '';
  const tournamentName = activeTournament?.name ?? '';
  const inviteCode = activeTournament?.inviteCode ?? '';

  const [data, setData] = useState<PersistedAppData>(emptyPersistedData);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [balancedTeams, setBalancedTeams] = useState<BalancedTeams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentMatchUser, setCurrentMatchUser] = useState<MatchUserInfo>({});

  const dataRef = useRef(data);
  const selectionRef = useRef(selectedPlayerIds);
  dataRef.current = data;
  selectionRef.current = selectedPlayerIds;

  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (
      nextData?: PersistedAppData,
      nextSelection?: Set<string>,
    ): Promise<boolean> => {
      if (!tournamentId) return false;
      const d = nextData ?? dataRef.current;
      const sel = nextSelection ?? selectionRef.current;
      setIsUploading(true);
      try {
        const result = await saveTournamentState(tournamentId, {
          ...d,
          selectedPlayerIds: [...sel],
        });
        if (result.photoWarning) {
          setSuccessMessage(
            `Guardado. ${result.photoWarning}`,
          );
        }
        setSyncError(null);
        return result.success;
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Error al sincronizar');
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [tournamentId],
  );

  const schedulePersist = useCallback(
    (nextData: PersistedAppData, nextSelection: Set<string>) => {
      if (persistRef.current) clearTimeout(persistRef.current);
      persistRef.current = setTimeout(() => {
        void persist(nextData, nextSelection);
      }, 300);
    },
    [persist],
  );

  useEffect(() => {
    setBalancedTeams(null);
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return undefined;
    setIsLoading(true);
    void resolveCurrentMatchUser().then(setCurrentMatchUser);
    return subscribeTournamentData(tournamentId, (state) => {
      setSyncError(state.error);
      if (state.loading) return;
      const selection = reconcileSelection(
        state.data.players,
        new Set(state.data.selectedPlayerIds),
        state.data.matchFormat,
      );
      setData(state.data);
      setSelectedPlayerIds(selection);
      setIsLoading(false);
      if (
        selection.size !== state.data.selectedPlayerIds.length ||
        [...selection].some((id, i) => state.data.selectedPlayerIds[i] !== id)
      ) {
        schedulePersist(state.data, selection);
      }
    });
  }, [tournamentId, schedulePersist]);

  const format = data.matchFormat;
  const required = squadSize(format);
  const showSelectionMode = data.players.length > required;
  const canBalance = selectedPlayerIds.size === required;
  const selectedCount = selectedPlayerIds.size;

  const applyData = useCallback(
    (
      updater: (prev: PersistedAppData, sel: Set<string>) => {
        data: PersistedAppData;
        selection: Set<string>;
      },
      options?: { persist?: boolean },
    ) => {
      setData((prev) => {
        const sel = selectionRef.current;
        const { data: next, selection } = updater(prev, sel);
        setSelectedPlayerIds(selection);
        selectionRef.current = selection;
        dataRef.current = next;
        if (options?.persist !== false) schedulePersist(next, selection);
        return next;
      });
    },
    [schedulePersist],
  );

  const value = useMemo<TeamContextValue>(
    () => ({
      tournamentId,
      tournamentName,
      inviteCode,
      players: data.players,
      selectedPlayerIds,
      matchFormat: format,
      balancedTeams,
      savedMatches: data.savedMatches,
      isLoading,
      isUploading,
      errorMessage,
      successMessage,
      syncError,
      currentMatchUser,
      showSelectionMode,
      canBalance,
      selectedCount,
      squadSize: required,
      clearError: () => setErrorMessage(null),
      clearSuccess: () => setSuccessMessage(null),
      clearSyncError: () => setSyncError(null),
      setMatchFormat: (f) => {
        if (f === format) return;
        applyData((prev, sel) => {
          const selection = reconcileSelection(prev.players, sel, f);
          setBalancedTeams(null);
          return {
            data: { ...prev, matchFormat: f },
            selection,
          };
        });
      },
      togglePlayerSelection: (playerId) => {
        if (!showSelectionMode) return;
        applyData((prev, sel) => {
          const next = new Set(sel);
          if (next.has(playerId)) {
            next.delete(playerId);
          } else if (next.size >= required) {
            setErrorMessage(`Ya elegiste ${required} jugadores para el partido`);
            return { data: prev, selection: sel };
          } else {
            next.add(playerId);
          }
          setBalancedTeams(null);
          setErrorMessage(null);
          return { data: prev, selection: next };
        });
      },
      getPlayer: (id) => data.players.find((p) => p.id === id),
      savePlayer: async (player, isNew) => {
        let nextData: PersistedAppData;
        let nextSel: Set<string>;
        if (isNew) {
          const players = [...data.players, player];
          const sel = new Set(selectedPlayerIds);
          if (players.length <= required) sel.add(player.id);
          nextData = { ...data, players };
          nextSel = sel;
        } else {
          nextData = {
            ...data,
            players: data.players.map((p) => (p.id === player.id ? player : p)),
          };
          nextSel = selectedPlayerIds;
        }
        setData(nextData);
        setSelectedPlayerIds(nextSel);
        setBalancedTeams(null);
        dataRef.current = nextData;
        selectionRef.current = nextSel;
        const ok = await persist(nextData, nextSel);
        if (ok) {
          setSuccessMessage(
            player.imageUri
              ? 'Jugador guardado · foto en la nube'
              : 'Jugador guardado',
          );
        }
        return ok;
      },
      removePlayer: (playerId) => {
        applyData((prev, sel) => {
          const players = prev.players.filter((p) => p.id !== playerId);
          const selection = reconcileSelection(
            players,
            new Set([...sel].filter((id) => id !== playerId)),
            prev.matchFormat,
          );
          setBalancedTeams(null);
          return { data: { ...prev, players }, selection };
        });
      },
      balanceTeamsAction: () => {
        const squad = data.players.filter((p) => selectedPlayerIds.has(p.id));
        if (squad.length !== required) {
          setErrorMessage(
            showSelectionMode
              ? `Elegí exactamente ${required} jugadores (${MATCH_FORMAT_LABEL[format]})`
              : `Necesitás al menos ${required} jugadores en tu plantel`,
          );
          return false;
        }
        try {
          setBalancedTeams(balanceTeams(squad, format));
          setErrorMessage(null);
          return true;
        } catch (e) {
          setErrorMessage(e instanceof Error ? e.message : 'Error al balancear');
          setBalancedTeams(null);
          return false;
        }
      },
      swapBalancedPlayers: (a, b) => {
        if (!balancedTeams) return;
        const updated = swapPlayersBetweenTeams(balancedTeams, a, b);
        if (updated) setBalancedTeams(updated);
      },
      saveCurrentTeamsAsMatch: () => {
        if (!balancedTeams) return null;
        const saved = balancedTeamsToSavedMatch(balancedTeams, {
          userId: currentMatchUser.userId,
          email: currentMatchUser.email || userEmail,
          displayName: currentMatchUser.displayName || displayName,
        });
        const next = {
          ...data,
          savedMatches: [saved, ...data.savedMatches],
        };
        setData(next);
        setBalancedTeams(null);
        setSuccessMessage('Partido guardado');
        dataRef.current = next;
        void persist(next, selectedPlayerIds);
        return saved.id;
      },
      getSavedMatch: (id) => data.savedMatches.find((m) => m.id === id),
      canManageMatchById: (matchId) => {
        const m = data.savedMatches.find((x) => x.id === matchId);
        return m ? canManageMatch(m, currentMatchUser.userId ?? '') : false;
      },
      updateMatchPlayerGoals: (matchId, playerId, goals) => {
        if (goals < 0) return;
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) {
          setErrorMessage('Solo quien creó el partido puede editarlo o borrarlo');
          return;
        }
        if (match.isFinalized) {
          setErrorMessage('Este partido ya está finalizado y no se puede modificar');
          return;
        }
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.map((m) =>
              m.id !== matchId
                ? m
                : {
                    ...m,
                    goalsByPlayerId: { ...m.goalsByPlayerId, [playerId]: goals },
                  },
            ),
          },
          selection: selectedPlayerIds,
        }));
      },
      swapMatchRosterPlayers: (matchId, playerIdA, playerIdB) => {
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) {
          setErrorMessage('Solo quien creó el partido puede editarlo o borrarlo');
          return;
        }
        if (match.isFinalized) {
          setErrorMessage('Este partido ya está finalizado y no se puede modificar');
          return;
        }
        if (matchHasAnyGoals(match)) {
          setErrorMessage(
            'No podés modificar los equipos: ya hay goles cargados en este partido',
          );
          return;
        }
        const roster = swapMatchRoster(match.roster, playerIdA, playerIdB);
        if (!roster) return;
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.map((m) =>
              m.id !== matchId ? m : { ...m, roster },
            ),
          },
          selection: selectedPlayerIds,
        }));
      },
      replaceMatchRosterPlayer: (matchId, outgoingPlayerId, incomingPlayerId) => {
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) {
          setErrorMessage('Solo quien creó el partido puede editarlo o borrarlo');
          return;
        }
        if (match.isFinalized) {
          setErrorMessage('Este partido ya está finalizado y no se puede modificar');
          return;
        }
        if (matchHasAnyGoals(match)) {
          setErrorMessage(
            'No podés modificar los equipos: ya hay goles cargados en este partido',
          );
          return;
        }
        const incoming = data.players.find((p) => p.id === incomingPlayerId);
        if (!incoming) {
          setErrorMessage('Ese jugador no está en la plantilla del torneo');
          return;
        }
        const updated = replaceMatchRosterPlayerInMatch(
          match.roster,
          match.goalsByPlayerId,
          outgoingPlayerId,
          incoming,
        );
        if (!updated) {
          setErrorMessage('No se pudo hacer el cambio (¿ya está en el partido?)');
          return;
        }
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.map((m) =>
              m.id !== matchId
                ? m
                : {
                    ...m,
                    roster: updated.roster,
                    goalsByPlayerId: updated.goalsByPlayerId,
                  },
            ),
          },
          selection: selectedPlayerIds,
        }));
        setSuccessMessage(`${incoming.name} entra al partido`);
      },
      commitMatchRoster: (matchId, roster, goalsByPlayerId) => {
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) {
          setErrorMessage('Solo quien creó el partido puede editarlo o borrarlo');
          return;
        }
        if (match.isFinalized) {
          setErrorMessage('Este partido ya está finalizado y no se puede modificar');
          return;
        }
        if (matchHasAnyGoals(match)) {
          setErrorMessage(
            'No podés modificar los equipos: ya hay goles cargados en este partido',
          );
          return;
        }
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.map((m) =>
              m.id !== matchId ? m : { ...m, roster, goalsByPlayerId },
            ),
          },
          selection: selectedPlayerIds,
        }));
        setSuccessMessage('Equipos del partido guardados');
      },
      finalizeMatch: (matchId) => {
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) return;
        if (match.isFinalized) return;
        const closedBy: MatchUserInfo = {
          userId: currentMatchUser.userId,
          email: currentMatchUser.email || userEmail,
          displayName: currentMatchUser.displayName || displayName,
        };
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.map((m) =>
              m.id !== matchId
                ? m
                : {
                    ...m,
                    isFinalized: true,
                    finalizedAtMillis: Date.now(),
                    finalizedBy: closedBy,
                  },
            ),
          },
          selection: selectedPlayerIds,
        }));
        setSuccessMessage(
          'Resultado en la nube · todos verán este partido y los goleadores',
        );
      },
      deleteSavedMatch: (matchId) => {
        const match = data.savedMatches.find((m) => m.id === matchId);
        if (!match || !canManageMatch(match, currentMatchUser.userId ?? '')) {
          setErrorMessage('Solo quien creó el partido puede editarlo o borrarlo');
          return;
        }
        applyData((prev) => ({
          data: {
            ...prev,
            savedMatches: prev.savedMatches.filter((m) => m.id !== matchId),
          },
          selection: selectedPlayerIds,
        }));
        setSuccessMessage('Partido eliminado');
      },
      clearAllSavedMatches: () => {
        const uid = currentMatchUser.userId ?? '';
        if (data.savedMatches.length === 0) return;
        const owned = data.savedMatches.filter((m) => canManageMatch(m, uid));
        if (owned.length === 0) {
          setErrorMessage('Solo podés borrar partidos que hayas creado vos');
          return;
        }
        const remaining = data.savedMatches.filter((m) => !canManageMatch(m, uid));
        applyData((prev) => ({
          data: { ...prev, savedMatches: remaining },
          selection: selectedPlayerIds,
        }));
        setSuccessMessage(
          remaining.length === 0
            ? 'Historial de partidos borrado en la nube'
            : `Se borraron ${owned.length} partidos tuyos · ${remaining.length} de otros no se modificaron`,
        );
      },
      getGoalScorerStandings: (f) => standings(data.savedMatches, f),
      getPlayerGoalHistory: (playerId, f) =>
        historyForPlayer(playerId, data.savedMatches, f),
      getScorerStanding: (playerId, f) =>
        standings(data.savedMatches, f).find((s) => s.playerId === playerId),
      finalizedMatchesCount: (f) =>
        data.savedMatches.filter((m) => m.isFinalized && m.matchFormat === f).length,
    }),
    [
      tournamentId,
      tournamentName,
      inviteCode,
      data,
      selectedPlayerIds,
      format,
      balancedTeams,
      isLoading,
      isUploading,
      errorMessage,
      successMessage,
      syncError,
      currentMatchUser,
      showSelectionMode,
      canBalance,
      selectedCount,
      required,
      applyData,
      persist,
      userEmail,
      displayName,
    ],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam debe usarse dentro de TeamProvider');
  return ctx;
}
