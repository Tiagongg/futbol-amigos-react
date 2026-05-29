import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type AppSession } from '../context/AuthContext';

function redirectFor(session: AppSession): string {
  switch (session) {
    case 'loading':
      return '/login';
    case 'logged_out':
      return '/login';
    case 'email_verification_pending':
      return '/verify-email';
    case 'pick_tournament':
      return '/tournaments';
    case 'ready':
      return '/';
    default:
      return '/login';
  }
}

function LoadingScreen() {
  return (
    <main className="app-shell">
      <p className="loading-text">Cargando…</p>
    </main>
  );
}

export function SessionRoute({ allowed }: { allowed: AppSession[] }) {
  const { session } = useAuth();

  if (session === 'loading') return <LoadingScreen />;
  if (!allowed.includes(session)) {
    return <Navigate to={redirectFor(session)} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { session } = useAuth();
  if (session === 'loading') return <LoadingScreen />;
  if (session !== 'logged_out') {
    return <Navigate to={redirectFor(session)} replace />;
  }
  return <Outlet />;
}
