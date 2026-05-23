# Phase 6 — Railway production checklist

Use this when closing Phase 6 on a Railway deployment. Local smoke tests remain in [`phase6-verification.md`](phase6-verification.md).

## API service

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

### Real firmware binary (required for hardware install)

`firmware.bin` is **not in git**. Production must run PlatformIO during build.

**Build command (recommended)** — Railway’s Node image has no `pip`. Use one of:

```bash
bash scripts/railway-build-web.sh
```

or:

```bash
pnpm build:web:railway
```

The repo includes [`nixpacks.toml`](../nixpacks.toml) (`platformio` in setup) so `pio` is on `PATH`; then a plain `pnpm build:web` also works on Railway.

**Do not use** `pip install platformio` unless you add Python to the build image yourself.

`RAILWAY_ENVIRONMENT` triggers a real firmware build via [`scripts/ensure-or-build-firmware.mjs`](../scripts/ensure-or-build-firmware.mjs). Build logs should show `Building ESP8266 firmware`.

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
