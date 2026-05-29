import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authErrorMessage } from '../lib/authErrors';
import { cloudSyncErrorMessage } from '../lib/cloudSyncErrors';
import * as authService from '../services/authService';
import * as membership from '../services/tournamentMembership';
import * as tournamentService from '../services/tournamentService';
import type { TournamentInfo } from '../types/models';

export type AppSession =
  | 'loading'
  | 'logged_out'
  | 'email_verification_pending'
  | 'pick_tournament'
  | 'ready';

interface AuthContextValue {
  session: AppSession;
  userEmail: string;
  displayName: string;
  activeTournamentId: string | null;
  tournaments: TournamentInfo[];
  isBusy: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  clearMessages: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerified: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
  createTournament: (name: string) => Promise<void>;
  joinTournament: (code: string) => Promise<void>;
  switchTournament: (tournamentId: string) => Promise<void>;
  leaveTournament: (tournamentId: string) => Promise<void>;
  removeMemberByEmail: (tournamentId: string, email: string) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const refreshSession = useCallback(async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await membership.ensureLegacyTournamentOwner();
      await membership.ensureMyMemberEmails();
      const profile = await tournamentService.loadUserProfile();
      const list = await tournamentService.listMyTournaments();
      const active = profile.activeTournamentId;
      const nextSession: AppSession =
        list.length === 0 ||
        !active ||
        !list.some((t) => t.id === active)
          ? 'pick_tournament'
          : 'ready';

      setUserEmail(profile.email);
      setDisplayName(profile.displayName);
      setActiveTournamentId(active);
      setTournaments(list.map((t) => ({ ...t, isActive: t.id === active })));
      setSession(nextSession);
    } catch (e) {
      setSession('pick_tournament');
      setErrorMessage(cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleAuthenticatedUser = useCallback(async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await authService.reloadUser();
      if (!authService.isEmailVerified()) {
        setSession('email_verification_pending');
        setUserEmail(authService.currentUser()?.email ?? '');
        return;
      }
      await refreshSession();
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    const unsub = authService.subscribeAuth((user) => {
      if (!user) {
        setSession('logged_out');
        setUserEmail('');
        setDisplayName('');
        setActiveTournamentId(null);
        setTournaments([]);
        setErrorMessage(null);
        setSuccessMessage(null);
        return;
      }
      void handleAuthenticatedUser();
    });
    return unsub;
  }, [handleAuthenticatedUser]);

  const signIn = async (email: string, password: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await authService.signIn(email, password);
      await handleAuthenticatedUser();
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
      setIsBusy(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Ingresá tu nombre');
      return;
    }
    setIsBusy(true);
    clearMessages();
    try {
      await authService.signUp(email, password);
      const mail = authService.currentUser()?.email ?? email;
      setSession('email_verification_pending');
      setUserEmail(mail);
      setDisplayName(trimmedName);
      setSuccessMessage(`Te enviamos un correo de verificación a ${mail}`);
      await tournamentService.loadUserProfile();
      await tournamentService.updateDisplayName(trimmedName);
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const resendVerificationEmail = async () => {
    setIsBusy(true);
    clearMessages();
    try {
      await authService.resendVerificationEmail();
      setSuccessMessage('Correo de verificación reenviado');
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const checkEmailVerified = async () => {
    setIsBusy(true);
    clearMessages();
    try {
      await authService.reloadUser();
      if (authService.isEmailVerified()) {
        await handleAuthenticatedUser();
      } else {
        setSession('email_verification_pending');
        setUserEmail(authService.currentUser()?.email ?? '');
        setErrorMessage(
          'Todavía no verificamos el correo. Revisá tu bandeja y spam.',
        );
      }
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await authService.sendPasswordReset(email);
      setSuccessMessage('Te enviamos un correo para restablecer la contraseña');
    } catch (e) {
      setErrorMessage(authErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const signOut = () => {
    clearMessages();
    authService.signOutUser();
  };

  const createTournament = async (name: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      const created = await tournamentService.safeTournamentAction(() =>
        tournamentService.createTournament(name),
      );
      setSuccessMessage(`Torneo creado · código ${created.inviteCode}`);
      await refreshSession();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const joinTournament = async (code: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      const info = await tournamentService.safeTournamentAction(() =>
        tournamentService.joinByInviteCode(code),
      );
      setSuccessMessage(`Te uniste a ${info.name}`);
      await refreshSession();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const switchTournament = async (tournamentId: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await tournamentService.setActiveTournament(tournamentId);
      await refreshSession();
    } catch (e) {
      setErrorMessage(cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const leaveTournament = async (tournamentId: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await tournamentService.safeTournamentAction(() =>
        membership.leaveTournament(tournamentId),
      );
      setSuccessMessage('Saliste del torneo');
      await refreshSession();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const removeMemberByEmail = async (tournamentId: string, email: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await tournamentService.safeTournamentAction(() =>
        membership.removeMemberByEmail(tournamentId, email),
      );
      setSuccessMessage('Integrante expulsado del torneo');
      await refreshSession();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    setIsBusy(true);
    clearMessages();
    try {
      await tournamentService.safeTournamentAction(() =>
        membership.deleteTournament(tournamentId),
      );
      setSuccessMessage('Torneo eliminado');
      await refreshSession();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : cloudSyncErrorMessage(e));
    } finally {
      setIsBusy(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userEmail,
      displayName,
      activeTournamentId,
      tournaments,
      isBusy,
      errorMessage,
      successMessage,
      clearMessages,
      signIn,
      signUp,
      resendVerificationEmail,
      checkEmailVerified,
      sendPasswordReset,
      signOut,
      refreshSession,
      createTournament,
      joinTournament,
      switchTournament,
      leaveTournament,
      removeMemberByEmail,
      deleteTournament,
    }),
    [
      session,
      userEmail,
      displayName,
      activeTournamentId,
      tournaments,
      isBusy,
      errorMessage,
      successMessage,
      clearMessages,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
