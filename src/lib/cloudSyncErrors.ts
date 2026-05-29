import { FirebaseError } from 'firebase/app';

export function cloudSyncErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return (
        'Sin permiso en Firestore. Publicá firestore.rules y verificá que ' +
        'seas miembro del torneo.'
      );
    }
    return error.message || `Error de Firestore (${error.code})`;
  }
  if (error instanceof Error) return error.message;
  return 'Error de sincronización';
}
