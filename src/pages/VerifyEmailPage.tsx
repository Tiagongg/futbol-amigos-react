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
      <p className="hint">
        Abrí el mail de Firebase, tocá el enlace y después pulsá «Ya verifiqué».
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
      <p className="form-footer">
        <SignOutButton variant="link">Cerrar sesión</SignOutButton>
      </p>
    </AuthLayout>
  );
}
