# Aquaponics Site Monitoring

A small monitoring platform for aquaponics sites, built to collect field sensor data, give operators a clear dashboard, and surface problems before they turn into emergencies.

ESP-based devices send telemetry to a NestJS API, PostgreSQL stores readings and site data, and a TanStack Start dashboard gives users a place to log in and inspect site health.

## Current status

| Area | Status |
| ---- | ------ |
| **Phases 1–6 (MVP)** | Implemented in code — ingest, alerts, dashboard, admin CRUD, snapshots, ESP8266 install wizard |
| **Hardware (ESP8266 D1 mini)** | Validated locally: browser flash via esp-web-tools, Wi‑Fi join, `POST /ingest` to a LAN API, serial logs at 115200 |
| **Firmware in git** | **No** — source in [`firmware/aquaponics-node/`](firmware/aquaponics-node/); built `firmware.bin` is gitignored and copied into the web app for the installer |
| **Phase 7** | Planned (notifications / alert policy) — not started — [`docs/phase7-agent-prompt.md`](docs/phase7-agent-prompt.md) |
| **Post-MVP** | Real camera driver, ESP32 CYD flash ([`docs/esp32-cyd-roadmap.md`](docs/esp32-cyd-roadmap.md)) |
| **Production** | Railway: [`docs/phase6-railway-production.md`](docs/phase6-railway-production.md) — `OBJECT_STORAGE_*` on API; web build with PlatformIO (`FIRMWARE_BUILD=real` or `RAILWAY_ENVIRONMENT`) |

Before calling Phase 6 production-ready on your environment, run [`docs/phase6-verification.md`](docs/phase6-verification.md) (§8 snapshot upload after latest firmware reflash).

**Staging devices:** use an admin-only **“Device staging”** site (do not assign to operators); calibrate there, then move devices to production sites.

## What Is Working

- **Device telemetry ingest:** devices can `POST /ingest` with an API key and submit readings for temperature, pH, water level, and flow. After migration `0003`, ingest evaluates **out-of-range** readings, **MVP heuristics** (spikes, flatlines, pH drift, level/flow step issues — see `ingest-heuristics.util.ts`), upserts matching alerts for **enabled** site sensors, **recomputes `device_offline` per site** from all devices’ `last_seen_at`, and sets **`captureImageNow`** when the site has any **active** alert.
- **Alerts API & UI:** GraphQL **`getAlerts`** (optional `siteId`, `type`, `status`; site RBAC) and **`resolveAlert`**; dashboard **`/alerts`** (active/all tabs) plus **active alerts** on each **`/sites/$siteId`** page with a link to the global list. In-process **`@nestjs/schedule`** (~60s) keeps **`device_offline`** in sync and emails **critical** alerts via **Resend** when `RESEND_API_KEY` and `ALERT_FROM_EMAIL` are set (`COOLDOWN_MINUTES`, default 45).
- **Database foundation:** migrations, seed data, users, sites, devices, sensor catalog, measurements, and **Phase 4 alert tables** (`site_sensor_catalog`, `sensor_thresholds`, `alerts` — migrate to `0003` to enable) are managed through `packages/db`. Migration **`0004`** adds optional **`sites.latitude`** / **`sites.longitude`** for admin site forms.
- **Authenticated API:** the dashboard API uses GraphQL, HTTP-only JWT cookies, bcrypt password hashing, and role-aware access checks. **Profile updates** use **`updateMe`** (current password required; clears the session cookie so the client signs in again). **Admin-only** GraphQL (`sensorCatalog`, `adminUsers` with assignments, `adminSites`, `adminDevices`, catalog and admin CRUD mutations) is implemented in [`apps/api/src/admin/`](apps/api/src/admin/).
- **Web dashboard shell:** TanStack Start is wired up with login, session loading, protected routes, site/measurement GraphQL reads, **site status** (OK / unknown / warning / critical from alerts + telemetry), an **alerts** page linked from the sidebar, **`/settings`** (account form + `updateMe`), and **`/admin/*`** (admin-only) for **users**, **sites** (sensors + thresholds + geo, optional **Google Maps** picker when `VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set), **devices** (API key on create/rotate; **browser installer** at `/admin/devices/$deviceId/install`), and **global sensor catalog** CRUD via GraphQL admin operations and [`apps/web/src/hooks/useAdmin.ts`](apps/web/src/hooks/useAdmin.ts).
- **Phase 6 — firmware + camera:** `POST /ingest/snapshot` (multipart JPEG), **`device_snapshots`** + S3 storage, presigned URLs on **`getSite.latestSnapshot`** and **`adminDevice.recentSnapshots`**, site detail map/snapshot layout, **admin device snapshot gallery**, esp-web-tools install wizard (wiring v2), admin **reset measurements** / **clear snapshots**, PlatformIO firmware ([`firmware/aquaponics-node/`](firmware/aquaponics-node/)). Gitignored **`firmware.bin`** — `pnpm firmware:build`; deploy hook [`scripts/ensure-or-build-firmware.mjs`](scripts/ensure-or-build-firmware.mjs).

The web app uses **directory-based routes** under `apps/web/src/routes/_authed/` with page UI in `apps/web/src/features/` so day-to-day edits hot-reload without regenerating `routeTree.gen.ts`. Full product spec: [`docs/greenfield-agent-handoff.md`](docs/greenfield-agent-handoff.md).

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
# Required when flashing ESP8266 devices (installer apiOrigin). Use your Mac LAN IP — not localhost.
# VITE_DEVICE_API_ORIGIN=http://192.168.1.106:4000
# Optional: enables the admin site map picker (Google Maps JavaScript API).
# VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
```

Keep **`VITE_PUBLIC_API_URL`** on `http://localhost:4000` for dashboard login (cookies). Set **`VITE_DEVICE_API_ORIGIN`** to the API URL the ESP can reach on your LAN (`ipconfig getifaddr en0`). Restart `pnpm dev:web` after changes.

Migration and seed commands read `DATABASE_PUBLIC_URL` from `packages/db/.env` when run through pnpm filters, so keep that file populated too.

## Installing firmware (ESP8266)

End-to-end flow: build a firmware image → serve it from the web app → flash in Chrome with Wi‑Fi and device config baked in → device posts telemetry to your API.

### Prerequisites

- **PlatformIO** — [`platformio.org`](https://platformio.org/) or `brew install platformio` (for a real on-device binary)
- **Google Chrome or Microsoft Edge** — Web Serial for the install wizard (not Safari/Firefox)
- **Dashboard** at **`http://localhost:3333`** (secure-enough context for Web Serial)
- **API** running at `http://localhost:4000` and reachable from the ESP on Wi‑Fi (often your Mac’s LAN IP via `VITE_DEVICE_API_ORIGIN`)
- **USB data cable** + serial driver on macOS if the port does not appear — [`docs/esp8266-usb-macos.md`](docs/esp8266-usb-macos.md)

### 1. Build and publish `firmware.bin`

The installer loads `/firmware/esp8266/firmware.bin` from `apps/web/public/`. That file is **not in git**.

```bash
# From repo root — real firmware (required for hardware)
pnpm firmware:build
```

`pnpm dev:web` runs `ensure-or-build-firmware` first; locally it creates a **placeholder** if missing (wizard UI only — **do not** flash that to hardware). On **Railway/CI**, the same hook runs **`pnpm firmware:build`** (requires PlatformIO on the build image).

After any C++ change under `firmware/aquaponics-node/`, run `pnpm firmware:build` again, then re-flash devices.

### 2. Configure the web app for devices

In `apps/web/.env`:

```bash
VITE_PUBLIC_API_URL=http://localhost:4000
VITE_DEVICE_API_ORIGIN=http://<your-lan-ip>:4000
```

Restart `pnpm dev:web`. The install form shows the device API origin the firmware will use.

### 3. Flash from the admin install wizard

1. Sign in as **admin** → **Devices** → create or open a device → **Install**.
2. Enter **Wi‑Fi SSID and password** (ESP8266 is **2.4 GHz only**).
3. Map sensor wires to GPIO pins (catalog colors/labels; config version **`v: 2`**).
4. **Continue to flash** → click **Connect and flash firmware** → pick the USB serial port (e.g. `/dev/cu.usbserial-…`).
5. Complete esp-web-tools prompts. When done, the device reboots with patched JSON in the 2 KiB config region (`deviceId`, `apiKey`, `apiOrigin`, Wi‑Fi, pins).

The device joins your router as a **client** (it does not create its own Wi‑Fi network). Check your router’s connected devices or serial output for an IP.

### 4. Verify (serial + dashboard)

**Serial monitor** (must be **115200** — close Chrome/IDE first so only one app uses the port):

```bash
pnpm firmware:monitor -- -p /dev/cu.usbserial-XXXX
```

Running `pio device monitor` from the repo root without the project dir defaults to **9600** and produces garbage output.

Press **RST** on the board. Expected lines:

```text
aquaponics-node starting
Device <uuid> API http://192.168.x.x:4000
Connecting WiFi........
IP: 192.168.x.x
Telemetry OK, next report in 300s
```

**Dashboard:** open the device’s site — `last_seen` and charts should update within the report interval (~300s by default).

| Problem | What to check |
| ------- | ------------- |
| `Invalid or missing device config` / `Config: …` | Re-flash from Install after `firmware:build`; hard-refresh the browser so it does not use a cached `firmware.bin` |
| No Wi‑Fi / no `IP:` | 2.4 GHz SSID/password; serial logs; router client list |
| `Telemetry HTTP 4xx/5xx` | API running; `VITE_DEVICE_API_ORIGIN` reachable from ESP; correct device API key |
| No USB port in Chrome | [`docs/esp8266-usb-macos.md`](docs/esp8266-usb-macos.md) |

More detail: [`firmware/aquaponics-node/README.md`](firmware/aquaponics-node/README.md), [`docs/esp-device-ingest.md`](docs/esp-device-ingest.md).

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

### Firmware scripts

| Command | Purpose |
| ------- | ------- |
| `pnpm firmware:ensure` | Create placeholder if `firmware.bin` is missing (`predev:web` / `prebuild:web`) |
| `pnpm firmware:placeholder` | Force-regenerate placeholder (installer UI only) |
| `pnpm firmware:build` | `pio run` in `firmware/aquaponics-node` + copy to `apps/web/public/…/firmware.bin` |
| `pnpm firmware:copy` | Copy only (if you already ran `pio run`) |

See **[Installing firmware (ESP8266)](#installing-firmware-esp8266)** above and **[`docs/phase6-railway-production.md`](docs/phase6-railway-production.md)** for Railway (web build: `bash scripts/railway-build-web.sh` or `pnpm build:web:railway` — not `pip`).

## Phase 6 verification

Phases 1–6 are implemented in code; run the smoke checklist before treating Phase 6 as production-ready:

- **[`docs/phase6-verification.md`](docs/phase6-verification.md)** — step-by-step API/storage/UI/hardware tests
- **[`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md)** — current Phase 6 status and key paths

## Documentation

- [`docs/development.md`](docs/development.md) — development commands, env, firmware binary, routing/UI conventions
- [`docs/esp8266-usb-macos.md`](docs/esp8266-usb-macos.md) — USB serial drivers and Chrome port picker on macOS
- [`docs/esp-device-ingest.md`](docs/esp-device-ingest.md) — ingest contract for firmware authors
- [`docs/greenfield-agent-handoff.md`](docs/greenfield-agent-handoff.md) — product spec and build phases
- [`docs/phase6-verification.md`](docs/phase6-verification.md) — Phase 6 smoke test checklist
- [`docs/phase6-agent-prompt.md`](docs/phase6-agent-prompt.md) — Phase 6 status and key paths
- [`docs/phase7-agent-prompt.md`](docs/phase7-agent-prompt.md) — **planned** Phase 7 (notifications & alert policy; deferred)
