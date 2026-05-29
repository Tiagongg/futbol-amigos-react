import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout, MessageBanner } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export function ForgotPasswordPage() {
  const { sendPasswordReset, isBusy, errorMessage, successMessage, clearMessages } =
    useAuth();
  const [email, setEmail] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    void sendPasswordReset(email);
  };

  return (
    <AuthLayout title="Recuperar contraseña">
      <MessageBanner error={errorMessage} success={successMessage} />
      <form className="form" onSubmit={onSubmit}>
        <label>
          Correo de tu cuenta
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isBusy}>
          {isBusy ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
      <p className="form-footer">
        <Link className="text-link" to="/login">
          Volver al login
        </Link>
      </p>
    </AuthLayout>
  );
}
