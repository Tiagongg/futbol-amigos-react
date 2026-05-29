import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SignOutButton } from './SignOutButton';
import { useTeam } from '../context/TeamContext';
import { useAppBack } from '../lib/useAppBack';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string;
  actions?: ReactNode;
  /** Solo en la pantalla de plantilla / jugadores */
  showTournamentsLink?: boolean;
  /** Botón Salir: solo en la lista de jugadores */
  showSignOut?: boolean;
}

export function AppShell({
  title,
  subtitle,
  children,
  backTo,
  actions,
  showTournamentsLink = false,
  showSignOut = false,
}: AppShellProps) {
  const goBack = useAppBack(backTo ?? '/');
  const team = useTeam();

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-left">
          {backTo ? (
            <button type="button" className="icon-btn" onClick={goBack} aria-label="Volver">
              ←
            </button>
          ) : null}
          <div>
            <p className="brand">Amiguis</p>
            <h1>{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
        </div>
        <div className="top-bar-actions">
          {actions}
          {showTournamentsLink ? (
            <Link className="btn btn-secondary btn-sm" to="/tournaments">
              Torneos
            </Link>
          ) : null}
          {team.inviteCode ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                void navigator.clipboard.writeText(team.inviteCode);
                team.clearSuccess();
              }}
              title="Copiar código de invitación"
            >
              Código {team.inviteCode}
            </button>
          ) : null}
          {showSignOut ? <SignOutButton /> : null}
        </div>
      </header>
      {team.isUploading ? <div className="upload-bar" /> : null}
      {team.syncError ? (
        <div className="sync-banner">
          <span>{team.syncError}</span>
          <button type="button" onClick={team.clearSyncError}>
            ×
          </button>
        </div>
      ) : null}
      <main className="page-content">{children}</main>
    </div>
  );
}

export function ToastMessages() {
  const team = useTeam();
  if (!team.errorMessage && !team.successMessage) return null;
  return (
    <div className="toast-stack">
      {team.errorMessage ? (
        <p className="banner banner-error" role="alert">
          {team.errorMessage}
          <button type="button" onClick={team.clearError}>
            ×
          </button>
        </p>
      ) : null}
      {team.successMessage ? (
        <p className="banner banner-success" role="status">
          {team.successMessage}
          <button type="button" onClick={team.clearSuccess}>
            ×
          </button>
        </p>
      ) : null}
    </div>
  );
}
