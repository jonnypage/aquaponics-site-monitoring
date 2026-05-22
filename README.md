# Aquaponics Site Monitoring

A small monitoring platform for aquaponics sites, built to collect field sensor data, give operators a clear dashboard, and surface problems before they turn into emergencies.

ESP-based devices send telemetry to a NestJS API, PostgreSQL stores readings and site data, and a TanStack Start dashboard gives users a place to log in and inspect site health.

## What Is Working

- **Device telemetry ingest:** devices can `POST /ingest` with an API key and submit readings for temperature, pH, water level, and flow. After migration `0003`, ingest evaluates **out-of-range** readings, **MVP heuristics** (spikes, flatlines, pH drift, level/flow step issues — see `ingest-heuristics.util.ts`), upserts matching alerts for **enabled** site sensors, **recomputes `device_offline` per site** from all devices’ `last_seen_at`, and sets **`captureImageNow`** when the site has any **active** alert.
- **Alerts API & UI:** GraphQL **`getAlerts`** (optional `siteId`, `type`, `status`; site RBAC) and **`resolveAlert`**; dashboard **`/alerts`** (active/all tabs) plus **active alerts** on each **`/sites/$siteId`** page with a link to the global list. In-process **`@nestjs/schedule`** (~60s) keeps **`device_offline`** in sync and emails **critical** alerts via **Resend** when `RESEND_API_KEY` and `ALERT_FROM_EMAIL` are set (`COOLDOWN_MINUTES`, default 45).
- **Database foundation:** migrations, seed data, users, sites, devices, sensor catalog, measurements, and **Phase 4 alert tables** (`site_sensor_catalog`, `sensor_thresholds`, `alerts` — migrate to `0003` to enable) are managed through `packages/db`. Migration **`0004`** adds optional **`sites.latitude`** / **`sites.longitude`** for admin site forms.
- **Authenticated API:** the dashboard API uses GraphQL, HTTP-only JWT cookies, bcrypt password hashing, and role-aware access checks. **Profile updates** use **`updateMe`** (current password required; clears the session cookie so the client signs in again). **Admin-only** GraphQL (`sensorCatalog`, `adminUsers` with assignments, `adminSites`, `adminDevices`, catalog and admin CRUD mutations) is implemented in [`apps/api/src/admin/`](apps/api/src/admin/).
- **Web dashboard shell:** TanStack Start is wired up with login, session loading, protected routes, site/measurement GraphQL reads, **site status** (OK / unknown / warning / critical from alerts + telemetry), an **alerts** page linked from the sidebar, **`/settings`** (account form + `updateMe`), and **`/admin/*`** (admin-only) for **users**, **sites** (sensors + thresholds + geo, optional **Google Maps** picker when `VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set), **devices** (API key on create/rotate; **browser installer** at `/admin/devices/$deviceId/install`), and **global sensor catalog** CRUD via GraphQL admin operations and [`apps/web/src/hooks/useAdmin.ts`](apps/web/src/hooks/useAdmin.ts).
- **Phase 6 — firmware + camera:** `POST /ingest/snapshot` (multipart JPEG), **`device_snapshots`** metadata in Postgres, image bytes in **S3-compatible storage** (use a **Railway Storage bucket** in production), presigned URLs on **`getSite.latestSnapshot`** and **`adminDevice.recentSnapshots`**, latest snapshot on site detail, esp-web-tools install wizard (catalog **wire colors/labels** → GPIO map; firmware config **`v: 2`** role pins; optional **`devices.pin_map`**), migration **`0008_sensor_wiring_template`** (`sensor_catalog.wiring_template`), PlatformIO firmware under [`firmware/aquaponics-node/`](firmware/aquaponics-node/) (v1 scalar + v2 role pin parsing). Installer binary at `apps/web/public/firmware/esp8266/firmware.bin` is **gitignored** — use `pnpm firmware:copy` after `pio run` (see **Firmware** below).

## Where It Is Headed

Phases **1–6** MVP scope from [`docs/greenfield-agent-handoff.md`](docs/greenfield-agent-handoff.md) is implemented.

**Phase 7 (planned, deferred):** notifications and alert policy — production email (Resend), per-site **`suppress_notifications`** for staging sites, and a path toward **SMS / WhatsApp / Signal**. No notification provider is required to run the MVP today. See [`docs/phase7-agent-prompt.md`](docs/phase7-agent-prompt.md).

Other post-MVP: real camera driver, ESP32 CYD board, firmware CI, production object storage on Railway.

**Staging devices:** use a normal **“Device staging”** site visible only to admins (do not assign that site to operators); assign devices there for calibration, then move them to production sites when ready.

The web app uses **directory-based routes** under `apps/web/src/routes/_authed/` with page UI in `apps/web/src/features/` so day-to-day edits hot-reload without regenerating `routeTree.gen.ts`.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| API | NestJS, GraphQL, REST ingest |
| Database | PostgreSQL, Kysely migrations and types |
| Web | TanStack Start, TanStack Router, TanStack Query, Tailwind CSS, `i18next` / `react-i18next` (en + es), light/dark/system theme |
| Auth | HTTP-only JWT cookies, bcrypt |

## Quick Start

You will need Node 22.12+, pnpm, and a PostgreSQL database.

```bash
pnpm install

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env

pnpm db:setup
```

`pnpm db:setup` runs the migrations and seeds an admin user, a demo site, and a demo device. The seed script prints the demo device's plaintext API key once; save it if you want to test device ingestion.

Start the API and web app in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

The API runs on `http://localhost:4000`, and the web app runs on `http://localhost:3333`.

## Local Environment

See [`.env.example`](.env.example) for the full environment contract. For local development, these are the important values:

**`apps/api/.env`**

```bash
DATABASE_PUBLIC_URL=postgres://postgres:postgres@localhost:5432/aquaponics
AUTH_SECRET=local-dev-secret
WEB_ORIGIN=http://localhost:3333

# Optional: camera snapshots (Railway Storage bucket — S3-compatible API).
# In Railway: add a Storage bucket → Credentials tab → Variable Reference into the API service.
# OBJECT_STORAGE_ENDPOINT=https://storage.railway.app
# OBJECT_STORAGE_REGION=auto
# OBJECT_STORAGE_BUCKET=
# OBJECT_STORAGE_ACCESS_KEY_ID=
# OBJECT_STORAGE_SECRET_ACCESS_KEY=
# OBJECT_STORAGE_FORCE_PATH_STYLE=false
```

Without `OBJECT_STORAGE_*`, `POST /ingest/snapshot` returns **503** (telemetry ingest still works).

**`apps/web/.env`**

```bash
VITE_PUBLIC_API_URL=http://localhost:4000
# Optional: enables the admin site map picker (Google Maps JavaScript API).
# VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
```

Migration and seed commands read `DATABASE_PUBLIC_URL` from `packages/db/.env` when run through pnpm filters, so keep that file populated too.

## Useful Commands

```bash
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm migrate:deploy
pnpm seed
pnpm db:setup
```

### Snapshot ingest (smoke test)

```bash
# Telemetry (readings is an object keyed by sensor catalog key)
curl -sS -X POST "http://localhost:4000/ingest" \
  -H "Content-Type: application/json" \
  -H "x-api-key: local-dev-ingest-key-change-in-prod-32chars" \
  -d '{"deviceId":"seed-device-1","timestamp":"2026-05-21T12:00:00.000Z","readings":{"temperature":24.5,"ph":7.0}}'

curl -X POST "http://localhost:4000/ingest/snapshot" \
  -H "x-api-key: <device-api-key>" \
  -F 'metadata={"deviceId":"seed-device-1","timestamp":"2026-05-21T12:00:00.000Z"};type=application/json' \
  -F "image=@/path/to/photo.jpg;type=image/jpeg"
```

Full checklist: [`docs/phase6-verification.md`](docs/phase6-verification.md).

### Firmware

`firmware.bin` is a **build artifact** (not in git). The install wizard serves it from `apps/web/public/firmware/esp8266/`.

```bash
# Placeholder (auto-created by pnpm dev:web if missing; installer UI only, not for hardware)
pnpm firmware:placeholder

# Real firmware (requires PlatformIO)
cd firmware/aquaponics-node && pio run
pnpm firmware:copy
```

Production deploys should run `pio run` + `firmware:copy` (or equivalent) before `build:web`, or serve the image from object storage later.

## Phase 6 verification

Phases 1–6 are implemented in code; run the smoke checklist before treating Phase 6 as production-ready:

- **[`docs/phase6-verification.md`](docs/phase6-verification.md)** — step-by-step API/storage/UI/hardware tests
- **[`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md)** — current Phase 6 status and key paths

## Documentation

- [`docs/development.md`](docs/development.md) — development commands, **folder-based routing** (`routes/_authed/…` + `features/*PageContent`), UI patterns (`PageBackLink`, loading)
- [`docs/greenfield-agent-handoff.md`](docs/greenfield-agent-handoff.md) — product spec and build phases
- [`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md) — Phase 6 status and agent bootstrap
- [`docs/phase6-verification.md`](docs/phase6-verification.md) — Phase 6 smoke test checklist
- [`docs/phase7-agent-prompt.md`](docs/phase7-agent-prompt.md) — **planned** Phase 7 (notifications & alert policy; deferred)
