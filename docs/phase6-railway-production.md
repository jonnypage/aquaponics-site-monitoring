# Phase 6 — Railway production checklist

Use this when closing Phase 6 on a Railway deployment. Local smoke tests remain in [`phase6-verification.md`](phase6-verification.md).

## API service

### Build and start (required)

`apps/api/dist/` is **gitignored** — it only exists after a compile step. If start fails with `Cannot find module .../dist/main.js`, the API service **did not run** `pnpm build:api` (or build logs were skipped).

| Setting | Value |
|---------|--------|
| **Root directory** | Repository root (not `apps/api`) |
| **Build command** | `pnpm build:api` or `bash scripts/railway-build-api.sh` |
| **Start command** | `pnpm start:api` |
| **Release command** | `pnpm migrate:deploy` |

Do **not** use the web firmware build (`bash scripts/railway-build-web.sh`) on the API service — that builds the dashboard, not Nest.

**Optional (API service env):** `RAILPACK_CONFIG_FILE=railpack.api.json` — forces API compile and copies `dist/` into the deploy image (see [`railpack.api.json`](../railpack.api.json)).

Build logs should show TypeScript compiling `packages/db` and `apps/api`. After deploy, `GET /health` on the API URL should return `{"ok":true}`.

### Postgres (required)

- `DATABASE_PUBLIC_URL` — variable reference from Postgres plugin
- `AUTH_SECRET` — stable across deploys (`openssl rand -hex 32`)
- `WEB_ORIGIN` — exact web app URL (no trailing slash)
- `NODE_ENV=production`
- `PG_POOL_MAX=3` (recommended)

**Release command:** `pnpm migrate:deploy`

### Object storage (required for snapshots)

1. Add a **Railway Storage** bucket to the project.
2. Open bucket **Credentials** and add variable references on the **API** service:

| Variable | Source |
|----------|--------|
| `OBJECT_STORAGE_ENDPOINT` | Bucket `ENDPOINT` |
| `OBJECT_STORAGE_REGION` | Usually `auto` |
| `OBJECT_STORAGE_BUCKET` | Bucket name |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Credentials |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Credentials |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `false` unless credentials say path-style |

3. Redeploy API.
4. Verify: `POST /ingest/snapshot` with a JPEG returns **201** `{ "ok": true }` (see verification §4).
5. Site detail / admin device edit should show presigned images.

Without storage env vars, telemetry still works; snapshots return **503**.

## Web service

### Build, start, and Railpack (required)

TanStack Start is a **Node SSR** app (`apps/web/.output/server/index.mjs`), not a static Vite `dist/` site. If the page is blank or never loads JS, check these first:

| Setting | Value |
|---------|--------|
| **Root directory** | Repository root |
| **Build command** | `bash scripts/railway-build-web.sh` (or `pnpm build:web:railway`) |
| **Start command** | `pnpm start:web` — **not** root `pnpm start` (that starts the API) |
| **Env (web service)** | `RAILPACK_CONFIG_FILE=railpack.web.json` |
| **Env (web service)** | `RAILPACK_NO_SPA=1` — disables Railpack Caddy static mode for Vite |

**Build-time variable (required):** `VITE_PUBLIC_API_URL` = public API URL (e.g. `https://your-api.up.railway.app`, no trailing slash). Vite bakes this into the bundle at **build** time; changing it later requires a **redeploy/rebuild**.

**API service (for login / GraphQL):** `WEB_ORIGIN` = exact web URL (e.g. `https://your-web.up.railway.app`, no trailing slash). Must match the browser origin or CORS blocks requests and the app looks empty after login.

After deploy, open browser devtools → Network: HTML should come from the web service; `/graphql` requests should go to your API URL (not `localhost:4000`).

### Real firmware binary (required for hardware install)

`firmware.bin` is **not in git**. Production must run PlatformIO during build.

**Builder:** Railway uses **Railpack** (not Nixpacks). On the **web** service set `RAILPACK_CONFIG_FILE=railpack.web.json` ([`railpack.web.json`](../railpack.web.json)) so **build-only** apt packages install for PlatformIO (`python3`, `pip`, …). They are **not** in the runtime container.

**Build command:**

```bash
bash scripts/railway-build-web.sh
```

(or `pnpm build:web:railway`)

**Do not use** `pip install platformio` as the build command — Railpack has no `pip` until apt packages install.

**Optional env** (if `railpack.web.json` is not picked up): on the **web** service only:

`RAILPACK_BUILD_APT_PACKAGES` = `python3,python3-pip,python3-venv,build-essential,git,curl,xz-utils`

Do **not** set `RAILPACK_DEPLOY_APT_PACKAGES` (would bloat runtime).

`RAILWAY_ENVIRONMENT` triggers a real firmware build via [`scripts/ensure-or-build-firmware.mjs`](../scripts/ensure-or-build-firmware.mjs). Build logs should show `Building ESP8266 firmware` then `pio run`.

**Watch paths:** include `firmware/**` and `scripts/**` so firmware changes redeploy web.

**Start command:** `pnpm start:web`

### Web env

- `VITE_PUBLIC_API_URL` — public API URL (dashboard GraphQL)
- `VITE_DEVICE_API_ORIGIN` — LAN-reachable API URL for flashed devices (often different from dashboard URL in the field)

## Sign-off

- [ ] API storage configured; snapshot ingest 201
- [ ] Web build logs show PlatformIO / `Building ESP8266 firmware`
- [ ] Install wizard downloads non-placeholder binary (size ≫ few KB)
- [ ] Hardware §8 in [`phase6-verification.md`](phase6-verification.md) (optional but recommended)
