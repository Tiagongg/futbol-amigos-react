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

Podés publicar la carpeta `dist/` en Vercel, Netlify o Firebase Hosting. Agregá el dominio en Firebase → Authentication → dominios autorizados.
