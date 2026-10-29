# 🚀 Stream Backend (Bun + Hono + PostgreSQL)

Backend ultraliviano (~15-35 MB RAM) para centralización de telemetría, eventos en vivo y webhooks de streaming multiplataforma (**Twitch**, **Kick**, **YouTube**, **TikTok**, **Facebook Live** y **Streamlabs**).

---

## 🛠️ Stack Tecnológico

- **Runtime:** [Bun](https://bun.sh/) (v1.4+) con servidor WebSocket nativo integrado.
- **Enrutador:** [Hono](https://hono.dev/) v4.
- **Base de Datos:** PostgreSQL 16 con `postgres.js` y soporte de `JSONB`.
- **Despliegue y Contenedores:** Docker (Multi-stage alpine) y Render Blueprint (`render.yaml`).

---

## 📋 Características Principales

1. **Gestión Inteligente de Sesiones (`sessionManager.ts`):**
   - Detección automática al iniciar stream en una o más plataformas.
   - **Grace Period de 3 minutos:** Tolera microcortes y reinicios de OBS sin fragmentar métricas.
   - Integración con señales de OBS Studio (`StreamStarted` / `StreamStopped`).
2. **Snapshots de Viewers Opcionales:**
   - Soporta plataformas desvinculadas guardando `NULL` (`facebook_viewers`, `tiktok_viewers`, etc.).
   - Cálculo dinámico de `total_viewers`.
3. **Adaptadores de Normalización:**
   - **Twitch:** Verificación HMAC-SHA256 (`Twitch-Eventsub-Message-Signature`).
   - **Facebook:** Verificación de reto `hub.challenge` y firma `X-Hub-Signature-256`.
   - **Streamlabs:** Parseo de donaciones, suscripciones y bits.
   - **Kick, TikTok y YouTube:** Normalización de chat, stickers, regalos y diamantes.
4. **WebSocket Hub (`/ws`):**
   - Transmisión en tiempo real de eventos a widgets propios sin requerir iframes de terceros.

---

## 🚀 Inicio Rápido

### Opción A: Con Docker Compose (Recomendado para local)

```bash
docker compose up --build
```

Esto levantará automáticamente el backend en `http://localhost:3000` y PostgreSQL 16 en el puerto `5432` con las migraciones iniciales aplicadas.

### Opción B: Directo con Bun

1. **Copiar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
2. **Instalar dependencias:**
   ```bash
   bun install
   ```
3. **Ejecutar migraciones:**
   ```bash
   bun run db:migrate
   ```
4. **Ejecutar pruebas automatizadas:**
   ```bash
   bun test
   ```
5. **Iniciar en modo desarrollo:**
   ```bash
   bun dev
   ```

---

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/healthz` | Diagnóstico de salud, uptime, estado de DB y memoria RAM en vivo |
| `GET` | `/ws` | Conexión WebSocket para widgets y dashboard |
| `POST` | `/api/webhooks/twitch` | Receptor de eventos Twitch EventSub |
| `GET`/`POST`| `/api/webhooks/facebook` | Verificación y recepción de comentarios/estrellas de Facebook |
| `POST` | `/api/webhooks/streamlabs` | Receptor de donaciones y alertas Streamlabs |
| `GET` | `/api/events` | Historial paginado de eventos unificados |
| `POST` | `/api/events/snapshots` | Registro de snapshots de espectadores |
| `GET` | `/api/sessions/active` | Estado de la sesión actual de streaming |
| `POST` | `/api/sessions/obs-signal` | Notificación de inicio/fin de emisión desde OBS Studio |

---

## ☁️ Despliegue en Render

El repositorio incluye un archivo [`render.yaml`](render.yaml) configurado para desplegar:
- Un **Web Service** Dockerizado (Plan Free).
- Una instancia de **PostgreSQL** administrada gratuita.

Para desplegar:
1. Conecta este repositorio en tu cuenta de [Render Dashboard](https://dashboard.render.com).
2. Render detectará automáticamente `render.yaml` y creará ambos servicios con las variables enlazadas.
