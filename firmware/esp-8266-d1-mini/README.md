# esp-8266-d1-mini

PlatformIO firmware for **WeMos D1 mini / NodeMCU-class ESP8266** site monitoring devices. Not part of the pnpm workspace.

## Serial monitor (115200 baud)

Firmware uses **`Serial.begin(115200)`**. From repo root:

```bash
pnpm firmware:monitor -- -p /dev/cu.usbserial-XXXX
```

If you run `pio device monitor` from the wrong directory, PlatformIO defaults to **9600** and logs look like gibberish. Use the command above or `cd firmware/esp-8266-d1-mini && pio device monitor`.

## Debug WiFi credentials on serial

`platformio.ini` sets `-DUD_WIFI_DEBUG=1` by default (temporary): boot logs print SSID and password at 115200. Set `-DUD_WIFI_DEBUG=0` in `build_flags` before production.

## Build

Requires [PlatformIO](https://platformio.org/). From repo root:

```bash
pnpm firmware:build
```

Or from this directory only: `pio run`, then from repo root `pnpm firmware:copy esp8266`.

`apps/web/public/firmware/esp8266/firmware.bin` is **gitignored**. If it is missing, `pnpm dev:web` generates a **placeholder** (installer UI only — not runnable on the device).

## Config region

The admin install wizard patches a 2 KiB region between `__UD_CFG_BEGIN__` and `__UD_CFG_END__` with JSON:

- `deviceId`, `apiKey`, `apiOrigin` (LAN IP reachable by the ESP — set via `VITE_DEVICE_API_ORIGIN` in `apps/web/.env`, not `localhost`)
- Wi-Fi credentials and GPIO `pins` for MVP sensors
- **`v: 3`** (preferred): per-sensor role map plus **`sensorTypes`** map; `null` disables a sensor. Legacy **`v: 2`** / **`v: 1`** still supported.
- `hasCamera` — when true, uploads a small 16:9 JPEG from placekittens.com (320×180); when false, no snapshots (including alert-driven `captureImageNow`).

Telemetry intervals and **`hasCamera`** come from the server via `POST /ingest` `commands` — the flashed JSON is only the initial value until the first successful ingest.

## HTTPS

For production APIs over HTTPS, the sketch uses `setInsecure()` for MVP (no certificate pinning). Prefer HTTP on a trusted LAN for local testing.

## Railway API + storage

Point `apiOrigin` at your deployed Nest API. Camera snapshots require a **Railway Storage bucket** (S3-compatible) on the API service — see root `README.md` and `apps/api/.env.example`.
