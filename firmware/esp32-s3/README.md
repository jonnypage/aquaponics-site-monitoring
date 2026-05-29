# esp32-s3

PlatformIO firmware for **ESP32-S3-DevKitC-1 N16R8**: real sensor telemetry only — no camera code or snapshot uploads. Not part of the pnpm workspace.

## Board

Target: **ESP32-S3-DevKitC-1** with **ESP32-S3-WROOM-1-N16R8** (16 MB flash, 8 MB OPI PSRAM). PSRAM is unused by this firmware but the build matches the module on common DevKitC-1 boards.

Do **not** flash this N16R8 image onto an **N8** (8 MB flash) module — partition tables differ and boot may fail.

## GPIO (DevKitC-1)

**Allowed for sensors (install wizard allowlist):** 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47, 48

**Caution:** 2 (on-board LED on many DevKitC-1 boards)

**Reserved — do not use for sensors:** 0, 3 (JTAG), 19–20 (USB), 26–37 (flash/PSRAM internal), 43–44 (UART), 45–46 (strapping)

Adjust [`apps/web/src/utils/device-board-gpio.ts`](../../apps/web/src/utils/device-board-gpio.ts) if your breakout differs.

## Serial monitor (115200 baud)

Use the USB port that prints `esp32-s3 starting` at boot (`/dev/cu.usbmodem*` on macOS). Same port for the admin install wizard in Chrome.

```bash
ls /dev/cu.usbmodem*
pnpm firmware:monitor:esp32:s3 -- -p /dev/cu.usbmodemXXXX
```

## Build

Requires [PlatformIO](https://platformio.org/). Produces a **merged** flash image for esp-web-tools:

```bash
pnpm firmware:build:esp32:s3
```

Output: `apps/web/public/firmware/esp32-s3/firmware.bin` (gitignored).

## Config region

Same 2 KiB patch slot as ESP8266 (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`), JSON **v3** from the admin install wizard. Camera fields in JSON are ignored.

## Sensor drivers

Real hardware drivers — **not** ESP8266-style dummy/jitter reporting.

| Catalog key | Driver |
|-------------|--------|
| `ds18b20` | OneWire + DallasTemperature on `signal` GPIO |
| `bncPhModule` | ADC on `signal` — default map: pH 7 @ 2.5 V, ~0.18 V/pH (calibrate per module) |
| `floatSwitch` | Digital input, pull-up — LOW = 100 % water level |
| `yfs201` | Pulse interrupt — 450 pulses/L → L/min over report interval |

Only sensors included in the flashed config are read. Failed reads are **omitted** from ingest — no fabricated fallback values.

## pH calibration

Default constants in `src/sensors.cpp` assume a typical analog pH module. Calibrate with buffer solutions and adjust `kPhVoltageAtPh7` / `kPhVoltsPerPh` for production sites.

## HTTPS

Uses `setInsecure()` for MVP (same as ESP8266). Prefer HTTP on a trusted LAN for local testing.
