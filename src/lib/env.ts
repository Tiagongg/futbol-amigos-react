/**
 * Variables de entorno del cliente (prefijo VITE_).
 * Nunca pongas service accounts ni claves privadas aquí: en el navegador no son secretos.
 */

function readEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Correo que reclama creadoría del torneo legacy al iniciar sesión (solo servidor + reglas protegen datos). */
export function getLegacyOwnerEmail(): string {
  return readEnv('VITE_LEGACY_OWNER_EMAIL').toLowerCase();
}
