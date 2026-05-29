# Amiguis · Web

Versión web completa de la app de fútbol Android. Usa el mismo proyecto Firebase (`futbol-amigos-2026`): misma cuenta, torneos, jugadores, partidos y goleadores sincronizados en tiempo real.

## Requisitos

- Node.js 18+
- Cuenta Firebase con Email/Password activo
- Archivo `.env.local` (ver `.env.example`)

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`

## Funcionalidades

- Login, registro, verificación de email, recuperar contraseña
- Crear / unirse / cambiar torneo (código de invitación)
- Plantilla de jugadores (nivel 1–10, foto, descripción)
- Formato 5v5 y 6v6 con selección de plantilla
- Balanceo de equipos (Oscura / Clara), intercambio y guardar partido
- Partidos: goles por jugador, finalizar, eliminar (solo el creador)
- Tabla de goleadores e historial por jugador
- Fotos en Firebase Storage
- Sync en vivo con Firestore

## Build producción

```bash
npm run build
npm run preview
```

## Despliegue

Podés publicar la carpeta `dist/` en Vercel, Netlify o Firebase Hosting.

1. En el hosting, configurá las mismas variables que en `.env.local` (`VITE_FIREBASE_*` y, si usás el torneo principal, `VITE_LEGACY_OWNER_EMAIL`).
2. En Firebase → Authentication → **Dominios autorizados**, agregá tu dominio (ej. `*.vercel.app` y el dominio propio).
3. Publicá `firestore.rules` y `storage.rules` desde la consola o con `firebase deploy`.

## Seguridad

- **No subas** `.env.local` ni archivos `*serviceAccount*.json` / `google-services.json` al repo (ya están en `.gitignore`).
- La `apiKey` de Firebase en el front es pública por diseño; limitá su uso en [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → tu API key → **Application restrictions** (HTTP referrers: solo tu dominio y `localhost`).
- Los datos los protegen **Firestore rules** y **Storage rules**, no ocultar la apiKey en el bundle.
- Opcional: activá [App Check](https://firebase.google.com/docs/app-check) en el proyecto para reducir abuso de la API.
