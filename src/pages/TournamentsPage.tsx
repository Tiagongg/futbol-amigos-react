import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageBanner } from '../components/AuthLayout';
import { SignOutButton } from '../components/SignOutButton';

export function TournamentsPage() {
  const {
    userEmail,
    tournaments,
    isBusy,
    errorMessage,
    successMessage,
    clearMessages,
    createTournament,
    joinTournament,
    switchTournament,
    session,
    activeTournamentId,
  } = useAuth();

  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    void createTournament(newName);
    setNewName('');
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    void joinTournament(inviteCode);
    setInviteCode('');
  };

  return (
    <main className="app-shell">
      <section className="hero-card page-wide">
        <header className="page-header">
          <div>
            <p className="brand">Amiguis · Web</p>
            <h1>Mis torneos</h1>
            <p className="subtitle">{userEmail}</p>
          </div>
          <div className="header-actions">
            {session === 'ready' && activeTournamentId ? (
              <Link className="btn btn-primary btn-sm" to="/">
                Ir a la plantilla
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </header>

        <MessageBanner error={errorMessage} success={successMessage} />

        <div className="grid-2">
          <article>
            <h2>Crear torneo</h2>
            <form className="form form-inline" onSubmit={onCreate}>
              <input
                type="text"
                placeholder="Nombre del torneo"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={isBusy}>
                Crear
              </button>
            </form>
          </article>

          <article>
            <h2>Unirme con código</h2>
            <form className="form form-inline" onSubmit={onJoin}>
              <input
                type="text"
                placeholder="Ej. AMIG2026"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <button type="submit" className="btn btn-primary" disabled={isBusy}>
                Unirme
              </button>
            </form>
          </article>
        </div>

        <h2 className="section-title">Tus torneos</h2>
        {tournaments.length === 0 ? (
          <p className="hint">Todavía no tenés torneos. Creá uno o unite con un código.</p>
        ) : (
          <ul className="tournament-list">
            {tournaments.map((t) => (
              <li
                key={t.id}
                className={`tournament-card ${t.isActive ? 'tournament-card-active' : ''}`}
              >
                <div className="tournament-card-body">
                  <div className="tournament-card-main">
                    <strong className="tournament-name">{t.name}</strong>
                    {t.isActive ? (
                      <span className="badge badge-active">Activo</span>
                    ) : null}
                  </div>
                  <p className="meta tournament-code">
                    Código de invitación:{' '}
                    <code>{t.inviteCode || '—'}</code>
                  </p>
                </div>
                <div className="tournament-card-action">
                  {!t.isActive || session === 'pick_tournament' ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={isBusy}
                      onClick={() => {
                        clearMessages();
                        void switchTournament(t.id);
                      }}
                    >
                      Usar este torneo
                    </button>
                  ) : (
                    <span className="badge badge-in-use">En uso</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
