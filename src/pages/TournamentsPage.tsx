import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageBanner } from '../components/AuthLayout';
import { TournamentCard } from '../components/TournamentCard';

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
    leaveTournament,
    removeMemberByEmail,
    deleteTournament,
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
              <TournamentCard
                key={t.id}
                tournament={t}
                session={session}
                isBusy={isBusy}
                onClearMessages={clearMessages}
                onSwitch={() => {
                  clearMessages();
                  void switchTournament(t.id);
                }}
                onLeave={() => leaveTournament(t.id)}
                onDelete={() => deleteTournament(t.id)}
                onExpel={(email) => removeMemberByEmail(t.id, email)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
