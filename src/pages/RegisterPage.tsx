import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, MessageBanner } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { signUp, isBusy, errorMessage, clearMessages } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    void signUp(email, password, displayName);
  };

  return (
    <AuthLayout title="Crear cuenta">
      <MessageBanner error={errorMessage} />
      <form className="form" onSubmit={onSubmit}>
        <label>
          Nombre (opcional)
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label>
          Correo
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña (mín. 6)
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isBusy}>
          {isBusy ? 'Registrando…' : 'Registrarme'}
        </button>
      </form>
      <p className="form-footer">
        <Link className="text-link" to="/login">
          Ya tengo cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}
