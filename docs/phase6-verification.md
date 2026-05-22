# Phase 6 verification checklist

Run these against a local stack (`pnpm db:setup`, `pnpm dev:api`, optional `pnpm dev:web`). Record pass/fail and notes in the **Results** section at the bottom.

**Seed defaults** (from `packages/db/src/scripts/seed.ts`):

- Device ID: `seed-device-1`
- API key: `local-dev-ingest-key-change-in-prod-32chars`
- Admin login: `admin@example.com` / `Admin123!` (see seed output if changed)

---

## 1. Build and database

```bash
pnpm install
pnpm typecheck
pnpm build:api
pnpm build:web
pnpm migrate:deploy
# pnpm seed   # if empty DB
```

| Step | Pass? | Notes |
|------|-------|-------|
| typecheck | | |
| build:api | | |
| build:web | | |
| migrations through 0008 | | |

---

## 2. Telemetry ingest + commands

API must be running on `http://localhost:4000`.

```bash
curl -sS -X POST "http://localhost:4000/ingest" \
  -H "Content-Type: application/json" \
  -H "x-api-key: local-dev-ingest-key-change-in-prod-32chars" \
  -d '{
    "deviceId": "seed-device-1",
    "timestamp": "2026-05-21T12:00:00.000Z",
    "readings": {
      "temperature": 24.5,
      "ph": 7.0
    }
  }'
```

**Expect:** HTTP **201**, JSON includes `commands` with `reportIntervalSeconds`, `snapshotIntervalSeconds`, `captureImageNow` (boolean).

| Check | Pass? | Notes |
|-------|-------|-------|
| HTTP 201 | | |
| `commands` object present | | |

**Rate limit:** Telemetry and snapshot share the same per-device limiter (`expected_interval_seconds` + `INGEST_RATE_LIMIT_BURST`, default burst **2** → up to **3** accepts per rolling window). Run **§3/§4 before §2**, or wait for `Retry-After` on **429**, or restart the API to clear in-memory buckets between burst tests.

---

## 3. Snapshot ingest without storage (503)

With **`OBJECT_STORAGE_*` unset or empty** in `apps/api/.env`:

```bash
curl -sS -o /dev/null -w "%{http_code}" -X POST "http://localhost:4000/ingest/snapshot" \
  -H "x-api-key: local-dev-ingest-key-change-in-prod-32chars" \
  -F 'metadata={"deviceId":"seed-device-1","timestamp":"2026-05-21T12:00:00.000Z"};type=application/json' \
  -F "image=@/dev/null;type=image/jpeg"
```

**Expect:** **503** (or 400 if empty file rejected — use a small real JPEG for a stricter test).

| Check | Pass? | Notes |
|-------|-------|-------|
| Not configured → 503 | | |

---

## 4. Snapshot ingest with storage

Configure **`apps/api/.env`** from a Railway Storage bucket (or MinIO):

- `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`

Use a real JPEG for a visible site-detail preview (firmware stub is only 4 bytes — decodes as a broken `<img>`):

```bash
# Example: download a test image (placekitten.com is often down; use placekittens.com)
curl -sSL -o /tmp/snap.jpg "https://placekittens.com/200/300"

curl -sS -X POST "http://localhost:4000/ingest/snapshot" \
  -H "x-api-key: local-dev-ingest-key-change-in-prod-32chars" \
  -F 'metadata={"deviceId":"seed-device-1","timestamp":"2026-05-21T12:00:00.000Z"};type=application/json' \
  -F "image=@/tmp/snap.jpg;type=image/jpeg"
```

**Expect:** `{ "ok": true }` (HTTP **201** on POST), row in `device_snapshots`, object in bucket.

| Check | Pass? | Notes |
|-------|-------|-------|
| HTTP 201 + `ok: true` | | |
| Postgres row | | |
| Object in bucket | | |

---

## 5. `captureImageNow` when site has active alert

1. Log in as admin → open a site → confirm an **active** alert exists, **or** trigger one with an out-of-range ingest (e.g. `ph: 99`).
2. Repeat **§2** telemetry curl.

**Expect:** `commands.captureImageNow === true` while any alert is active on that site.

| Check | Pass? | Notes |
|-------|-------|-------|
| Active alert exists | | |
| `captureImageNow: true` | | |

---

## 6. GraphQL latest snapshot (site detail)

1. After §4 succeeds, log in to web `http://localhost:3333` as admin.
2. Open the seeded site → confirm **latest snapshot** card shows image + time.

Optional GraphQL (with session cookie from browser devtools):

```graphql
query { getSite(id: "<site-uuid>") { id name latestSnapshot { deviceId takenAt imageUrl } } }
```

| Check | Pass? | Notes |
|-------|-------|-------|
| `latestSnapshot` in GraphQL | | |
| Image loads in UI | | |

---

## 7. Install wizard (browser)

1. Admin → Devices → create or open device → **Install**.
2. Confirm: Wi‑Fi fields, sensor list with wire colors, duration dropdowns, **Continue to flash**, esp-web-tools **Connect** button (Chrome/Edge on `http://localhost:3333`).
3. Optional USB: flash with real `firmware.bin` (`pnpm firmware:build`; placeholder is UI-only).
4. **No port in picker?** See **[`docs/esp8266-usb-macos.md`](esp8266-usb-macos.md)** — CP210x or CH340 drivers on macOS, verify with `ls /dev/cu.*`.

| Check | Pass? | Notes |
|-------|-------|-------|
| Install page loads | | |
| Config patch / flash step | | |
| USB flash (hardware) | | |

---

## 8. Hardware end-to-end (optional)

Requires real `firmware.bin` (gitignored; from PlatformIO):

```bash
pnpm firmware:build
```

| Check | Pass? | Notes |
|-------|-------|-------|
| Device joins Wi‑Fi | | |
| Telemetry in dashboard | | |
| Scheduled / alert snapshot upload | | |

---

## Results log

| Date | Runner | Summary |
|------|--------|---------|
| 2026-05-22 | Agent (curl) + manual UI | **§1** typecheck + build:api + migrate OK (prior session). **§2** telemetry **201**, `commands` present. **§5** `ph: 99` ingest **201**; `captureImageNow: true` on follow-up. **§3/§4** first attempt **429** after three telemetry posts (shared limiter; `Retry-After: ~274`). After API restart: snapshot **201** `{"ok":true}` → **§4** (storage configured). **§3** **503** `Object storage is not configured` with `OBJECT_STORAGE_*` removed + API restart. **§6** site detail snapshot card shows image after [placekittens.com](https://placekittens.com/) upload (~8 KB JPEG). **§7** install wizard + USB flash **pass** (after fixes: `esp-web-install-button` tag, manifest blob URLs, client-only `esp-web-tools` import). **§8** E2E telemetry on dashboard after flash — confirm separately. Fixes: `createAdminUser` `@IsEnum(Role)`; installer manifest/SSR. |

