# aquaponics-node (ESP8266)

PlatformIO firmware for site monitoring devices. Not part of the pnpm workspace.

## Build

Requires [PlatformIO](https://platformio.org/). From this directory:

```bash
pio run
```

Copy the built image into the web installer static path (from repo root):

```bash
pnpm firmware:copy
```

`apps/web/public/firmware/esp8266/firmware.bin` is **gitignored**. If it is missing, `pnpm dev:web` generates a **placeholder** (installer UI only — not runnable on the device).

## Config region

The admin install wizard patches a 2 KiB region between `__UD_CFG_BEGIN__` and `__UD_CFG_END__` with JSON:

- `deviceId`, `apiKey`, `apiOrigin` (LAN IP reachable by the ESP, e.g. `http://192.168.1.106:4000` — set via `VITE_DEVICE_API_ORIGIN` in `apps/web/.env`, not `localhost`)
- Wi-Fi credentials and GPIO `pins` for MVP sensors
- **`v: 2`** (preferred): per-sensor role map, e.g. `"ph": { "signal": 5 }`; `null` disables a sensor. Legacy **`v: 1`** scalar pins (`"ph": 5`) map to role `signal`.
- `hasCamera` (snapshot uploads use a stub JPEG until a camera driver is added)

Telemetry intervals come from the server via `POST /ingest` `commands` — not from the flashed JSON.

## HTTPS

For production APIs over HTTPS, the sketch uses `setInsecure()` for MVP (no certificate pinning). Prefer HTTP on a trusted LAN for local testing, or terminate TLS at your edge and use HTTP on the device network if policy allows.

## Railway API + storage

Point `apiOrigin` at your deployed Nest API. Camera snapshots require a **Railway Storage bucket** (S3-compatible) on the API service — see root `README.md` and `apps/api/.env.example`.
