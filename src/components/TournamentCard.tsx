import { FormEvent, useEffect, useState } from 'react';
import { LEGACY } from '../lib/firestoreConstants';
import type { TournamentInfo, TournamentMember } from '../types/models';
import * as membership from '../services/tournamentMembership';

interface TournamentCardProps {
  tournament: TournamentInfo;
  session: string;
  isBusy: boolean;
  onSwitch: () => void;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onExpel: (email: string) => Promise<void>;
  onClearMessages: () => void;
}

export function TournamentCard({
  tournament: t,
  session,
  isBusy,
  onSwitch,
  onLeave,
  onDelete,
  onExpel,
  onClearMessages,
}: TournamentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<TournamentMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [expelEmail, setExpelEmail] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isLegacy = t.id === LEGACY.tournamentId;

  useEffect(() => {
    if (!expanded || !t.isCreator) return undefined;
    let cancelled = false;
    setLoadingMembers(true);
    void membership.listTournamentMembers(t.id).then((list) => {
      if (!cancelled) {
        setMembers(list);
        setLoadingMembers(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expanded, t.id, t.isCreator]);

  const reloadMembers = () => {
    if (!t.isCreator) return;
    setLoadingMembers(true);
    void membership.listTournamentMembers(t.id).then((list) => {
      setMembers(list);
      setLoadingMembers(false);
    });
  };

  const onSubmitExpel = (e: FormEvent) => {
    e.preventDefault();
    onClearMessages();
    void onExpel(expelEmail).then(() => {
      setExpelEmail('');
      reloadMembers();
    });
  };

  return (
    <li className={`tournament-card ${t.isActive ? 'tournament-card-active' : ''}`}>
      <div className="tournament-card-top">
        <div className="tournament-card-body">
          <div className="tournament-card-main">
            <strong className="tournament-name">{t.name}</strong>
            {t.isActive ? <span className="badge badge-active">Activo</span> : null}
            {t.isCreator ? <span className="badge badge-creator">Creador</span> : null}
            {isLegacy ? <span className="badge badge-legacy">Principal</span> : null}
          </div>
          <p className="meta tournament-code">
            Código de invitación:{' '}
            <code>{t.inviteCode || (isLegacy ? LEGACY.inviteCode : '—')}</code>
          </p>
          {isLegacy ? (
            <p className="hint small">
              Torneo compartido de la app Android. Código clásico: {LEGACY.inviteCode}
            </p>
          ) : null}
        </div>
        <div className="tournament-card-action">
          {!t.isActive || session === 'pick_tournament' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isBusy}
              onClick={onSwitch}
            >
              Usar este torneo
            </button>
          ) : (
            <span className="badge badge-in-use">En uso</span>
          )}
        </div>
      </div>

      <div className="tournament-card-footer">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Ocultar opciones' : 'Opciones'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm danger-text"
          disabled={isBusy}
          onClick={() => setConfirmLeave(true)}
        >
          Salir del torneo
        </button>
        {t.isCreator && !isLegacy ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm danger-text"
            disabled={isBusy}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar torneo
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="tournament-expanded">
          {t.isCreator ? (
            <section className="tournament-manage">
              <h3>Integrantes</h3>
              {loadingMembers ? (
                <p className="hint">Cargando integrantes…</p>
              ) : members.length === 0 ? (
                <p className="hint">Todavía no hay integrantes en este torneo.</p>
              ) : (
                <ul className="member-email-list">
                  {members.map((m) => (
                    <li key={m.uid}>
                      <span>{m.displayLabel}</span>
                      {!m.email ? (
                        <span className="meta"> · sin correo guardado</span>
                      ) : null}
                      {m.role === 'admin' ? (
                        <span className="meta"> · creador</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <form className="form form-inline expel-form" onSubmit={onSubmitExpel}>
                <input
                  type="email"
                  placeholder="Correo a expulsar"
                  required
                  value={expelEmail}
                  onChange={(e) => setExpelEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={isBusy}>
                  Expulsar
                </button>
              </form>
              <p className="hint small">
                Para expulsar, usá el mismo correo con el que se registraron. Si no
                aparece arriba, pediles que cierren sesión, vuelvan a entrar y se unan
                otra vez con el código.
              </p>
            </section>
          ) : (
            <p className="hint small">
              Solo el creador del torneo puede ver quiénes están adentro. Podés salir del
              torneo con el botón de arriba.
            </p>
          )}
        </div>
      ) : null}

      {confirmLeave ? (
        <div className="modal-backdrop nested-modal">
          <div className="modal">
            <h3>Salir del torneo</h3>
            <p>
              ¿Querés salir de «{t.name}»? Dejarás de ver sus jugadores y partidos hasta
              que te unas de nuevo con el código.
              {t.isCreator && !isLegacy ? (
                <>
                  {' '}
                  El torneo sigue existiendo para los demás. Para borrarlo por completo
                  usá «Eliminar torneo».
                </>
              ) : null}
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isBusy}
                onClick={() => {
                  void onLeave().finally(() => setConfirmLeave(false));
                }}
              >
                Sí, salir
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmLeave(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="modal-backdrop nested-modal">
          <div className="modal">
            <h3>Eliminar torneo</h3>
            <p>
              ¿Eliminar «{t.name}» para todos? Se borran jugadores, partidos y el código{' '}
              <code>{t.inviteCode || '—'}</code>. Esta acción no se puede deshacer.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary danger-text"
                disabled={isBusy}
                onClick={() => {
                  void onDelete().finally(() => setConfirmDelete(false));
                }}
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
