import { FirebaseError } from 'firebase/app';

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'El correo no es válido';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/user-not-found':
        return 'No hay cuenta con ese correo';
      case 'auth/email-already-in-use':
        return 'Ese correo ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Probá más tarde';
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos';
      default:
        return error.message || `Error de autenticación (${error.code})`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Error de autenticación';
}
