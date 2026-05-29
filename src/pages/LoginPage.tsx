import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, MessageBanner } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn, isBusy, errorMessage, clearMessages } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    void signIn(email, password);
  };

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Misma cuenta que en la app Android.">
      <MessageBanner error={errorMessage} />
      <form className="form" onSubmit={onSubmit}>
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
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isBusy}>
          {isBusy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="form-footer">
        <Link className="text-link" to="/register">
          Crear cuenta
        </Link>
        {' · '}
        <Link className="text-link" to="/forgot-password">
          Olvidé mi contraseña
        </Link>
      </p>
    </AuthLayout>
  );
}
