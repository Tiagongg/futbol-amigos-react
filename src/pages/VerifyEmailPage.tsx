import { AuthLayout, MessageBanner } from '../components/AuthLayout';
import { SignOutButton } from '../components/SignOutButton';
import { useAuth } from '../context/AuthContext';

export function VerifyEmailPage() {
  const {
    userEmail,
    isBusy,
    errorMessage,
    successMessage,
    clearMessages,
    resendVerificationEmail,
    checkEmailVerified,
  } = useAuth();

  return (
    <AuthLayout
      title="Verificá tu correo"
      subtitle={userEmail ? `Enviamos un enlace a ${userEmail}` : undefined}
    >
      <MessageBanner error={errorMessage} success={successMessage} />
      <p className="auth-notice auth-notice-warning">
        Si no ves el correo en la bandeja de entrada, revisá <strong>spam</strong> o correo
        no deseado.
      </p>
      <p className="hint">
        Abrí el mail de verificación, tocá el enlace y después pulsá «Ya verifiqué».
      </p>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isBusy}
          onClick={() => {
            clearMessages();
            void checkEmailVerified();
          }}
        >
          Ya verifiqué
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isBusy}
          onClick={() => {
            clearMessages();
            void resendVerificationEmail();
          }}
        >
          Reenviar correo
        </button>
      </div>
      <div className="auth-footer-actions">
        <SignOutButton className="btn btn-secondary">Cerrar sesión</SignOutButton>
      </div>
    </AuthLayout>
  );
}
