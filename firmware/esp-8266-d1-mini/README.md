# esp-8266-d1-mini

PlatformIO firmware for **WeMos D1 mini / NodeMCU-class ESP8266** site monitoring devices. Not part of the pnpm workspace.

## Serial monitor (115200 baud)

Firmware uses **`Serial.begin(115200)`**. From repo root:

```bash
pnpm firmware:monitor -- -p /dev/cu.usbserial-XXXX
```

If you run `pio device monitor` from the wrong directory, PlatformIO defaults to **9600** and logs look like gibberish. Use the command above or `cd firmware/esp-8266-d1-mini && pio device monitor`.

## Debug WiFi credentials on serial

`platformio.ini` sets `-DUD_WIFI_DEBUG=0` (production default). Set it to `1` in `build_flags` only for bench debugging: boot logs then print the Wi-Fi SSID at 115200 (never the password).

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
- Camera fields (`hasCamera`, snapshot intervals, `captureImageNow`) are ignored. **This board has no camera and no snapshot code.** The install wizard hides the camera options for it.

Intervals come from the server via `POST /checkin` and `POST /ingest` `commands` — the flashed JSON is only the initial value until the first successful check-in.

## Sensor drivers

Real hardware drivers. Failed reads are omitted from ingest.

| Catalog key | Driver |
|-------------|--------|
| `ds18b20` | OneWire + DallasTemperature on `signal` GPIO |
| `bncPhModule` | 10-bit ADC on **A0 only** (install wizard GPIO **17**). Header is 0–3.3 V via the D1 mini divider. Default map: pH 7 @ 2.5 V, ~0.18 V/pH |
| `floatSwitch` | Digital input, pull-up — LOW = 100 % water level. GPIO16 has no internal pull-up |
| `yfs201` | Rising-edge interrupt — 450 pulses/L → L/min over the report interval. A0 and GPIO16 cannot count pulses |

Boot and sensor lines match the ESP32-S3 firmware (`Sensors configured`, `Sensor <key> (<type>): …`, `Check-in OK`, `Telemetry uploaded`, `WiFi connect failed status=`), minus the snapshot interval since there are no snapshots.

Runtime loop:

1. Wait for Wi-Fi and a valid NTP clock (see below)
2. `POST /checkin` when `checkinIntervalSeconds` elapsed (default 5 min)
3. `POST /ingest` when `sendTelemetryNow` or `reportIntervalSeconds` elapsed (default 30 min)
4. Sleep until the next due check-in or telemetry. Server interval changes apply on the same loop. Failed or rate-limited requests back off on their own clocks (`Retry-After` is honored).

## NTP

Check-ins and telemetry carry the device clock, so **nothing is sent while the clock is unset** (reads 1970). If NTP fails at boot, the firmware logs `Clock not set, retrying NTP` and retries about once a minute until it syncs, then logs `NTP synced` and carries on.

## Weekly reboot

The firmware restarts itself after **7 days of uptime**. No clock or timezone needed, and it cannot reboot-loop. This keeps `millis()` far from its ~49 day wrap. The check runs only between requests. After boot it checks in and sends telemetry immediately.

## HTTPS

For production APIs over HTTPS, the sketch uses `setInsecure()` for MVP (no certificate pinning). Prefer HTTP on a trusted LAN for local testing.

## Railway API + storage

Point `apiOrigin` at your deployed Nest API. Camera snapshots require a **Railway Storage bucket** (S3-compatible) on the API service — see root `README.md` and `apps/api/.env.example`.
