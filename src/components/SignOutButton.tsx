import { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface SignOutButtonProps {
  className?: string;
  variant?: 'button' | 'link';
  children?: ReactNode;
}

export function SignOutButton({
  className,
  variant = 'button',
  children = 'Salir',
}: SignOutButtonProps) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const btnClass =
    className ??
    (variant === 'link' ? 'btn-link' : 'btn btn-secondary btn-sm');

  return (
    <>
      <button type="button" className={btnClass} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-labelledby="signout-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="signout-title">Cerrar sesión</h3>
            <p>¿Estás seguro de que querés cerrar sesión?</p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                Sí, cerrar sesión
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
