import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="app-shell">
      <section className="auth-card">
        <p className="brand">Amiguis · Web</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        {children}
      </section>
    </main>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="text-link" to={to}>
      {children}
    </Link>
  );
}

export function MessageBanner({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) return <p className="banner banner-error banner-block">{error}</p>;
  if (success) return <p className="banner banner-success banner-block">{success}</p>;
  return null;
}
