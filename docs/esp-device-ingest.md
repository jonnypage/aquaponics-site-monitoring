# Device HTTP ingest

Authoritative contracts live in **[greenfield-agent-handoff.md](greenfield-agent-handoff.md)** (telemetry, snapshot multipart, command fields).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/ingest` | JSON telemetry; response includes `commands` |
| `POST` | `/ingest/snapshot` | Multipart JPEG + metadata JSON |

Auth: header `x-api-key` (plaintext; server stores SHA-256).

## Camera snapshots (storage)

Image bytes are stored in **S3-compatible object storage**. On Railway, use a **Storage bucket** and map credentials to the API service — see root `README.md` and `apps/api/.env.example` (`OBJECT_STORAGE_*`).

Postgres table `device_snapshots` holds metadata only.

## Firmware

- PlatformIO project: [`firmware/aquaponics-node/`](../firmware/aquaponics-node/)
- Browser installer: `/admin/devices/$deviceId/install` (esp-web-tools)
- Installer binary: `apps/web/public/firmware/esp8266/firmware.bin` (gitignored; `pnpm firmware:copy` after `pio run`, or `firmware:placeholder` for UI-only dev)
