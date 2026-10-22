# ESP32-S3 DevKitC-1 telemetry firmware

Production firmware for **ESP32-S3-DevKitC-1 N16R8** site nodes: **real sensor drivers** only — no camera code, no snapshot uploads, no camera toggle in the install wizard.

Firmware project: [`firmware/esp32-s3/`](../firmware/esp32-s3/README.md)

Public binary path: `apps/web/public/firmware/esp32-s3/firmware.bin` (gitignored)

Install board id: **`esp32-s3`**

## vs ESP8266 and ESP32-S3 CAM

| Board | Sensors | Camera |
|-------|---------|--------|
| ESP8266 | Dummy/jitter simulated (`readDummyWithJitter`) | Optional placekittens.com stub JPEG |
| **ESP32-S3 DevKitC-1** (`esp32-s3`) | **Real drivers** (same stack as CAM) | **None** — no UI toggle, no firmware code |
| ESP32-S3 CAM (`esp32-s3-cam`) | Real drivers | Optional OV3660 JPEG snapshots |

## Board compatibility

Target: **ESP32-S3-DevKitC-1** with **ESP32-S3-WROOM-1-N16R8** (16 MB flash, 8 MB OPI PSRAM).

Do **not** flash this N16R8 image onto an **N8** (8 MB flash) module — partition tables differ and boot may fail. PSRAM is unused by this firmware but the build matches common N16R8 DevKitC-1 modules.

## Install wizard

Admin → Devices → **Install** → select **ESP32-S3 DevKitC-1 (N16R8)**:

1. No **Has camera** checkbox or snapshot interval field
2. Patch 2 KiB JSON config region (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`)
3. Flash merged binary over USB via esp-web-tools (Chrome, secure context)

## Build

Requires [PlatformIO](https://platformio.org/) on PATH:

```bash
pnpm firmware:build:esp32:s3    # DevKitC-1 only
pnpm firmware:build:esp32       # both ESP32-S3 boards
pnpm firmware:build             # ESP8266 + both ESP32-S3
pnpm firmware:monitor:esp32:s3 -- -p /dev/cu.usbmodemXXXX
```

Build runs `pio run` then merges bootloader/partitions/app into `firmware.factory.bin`.

## Runtime loop

Uses shared [`firmware/shared/aquaponics-core/`](../firmware/shared/aquaponics-core/):

1. Sleep **`checkinIntervalSeconds`** (default 5 min from server)
2. `POST /checkin` → parse commands
3. `POST /ingest` when `sendTelemetryNow` or report interval elapsed (default **30 min**)
4. YFS201 flow rate uses **actual elapsed seconds** since last report (correct after on-demand telemetry)

Serial: `Check-in OK`, `Telemetry uploaded`.

## Sensors (catalog keys)

Real hardware drivers — failed reads are **omitted** from ingest, not replaced with fake values.

| Key | Type | Notes |
|-----|------|-------|
| `ds18b20` | temperature | OneWire on `signal` GPIO |
| `bncPhModule` | ph | ADC on `signal`; default map pH 7 @ 2.5 V, ~0.18 V/pH — calibrate per module |
| `floatSwitch` | waterLevel | Digital input, pull-up; LOW = 100 % |
| `yfs201` | waterFlow | Pulse interrupt; 450 pulses/L |

Only sensors **included** in the install wizard (with valid GPIOs) are read.

## GPIO (DevKitC-1)

**Allowed for sensors:** 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47, 48 — **caution:** 2 (on-board LED)

**Reserved:** JTAG 3, USB 19–20, flash/PSRAM internal 26–37, UART 43–44, strapping 0/45/46

See [`apps/web/src/utils/device-board-gpio.ts`](../apps/web/src/utils/device-board-gpio.ts) for the install wizard allowlist.

## pH calibration

Default firmware constants assume a typical analog pH module (mid-scale ≈ pH 7). For production sites, calibrate with buffer solutions and adjust constants in `firmware/esp32-s3/src/sensors.cpp`.

## USB serial (macOS)

Use the USB port that prints `esp32-s3 starting` at boot (`/dev/cu.usbmodem*`).

```bash
ls /dev/cu.usbmodem*
pnpm firmware:monitor:esp32:s3 -- -p /dev/cu.usbmodemXXXX
```

Same port for the admin install wizard in Chrome.

## Verification checklist

1. `pnpm firmware:build:esp32:s3` produces `public/firmware/esp32-s3/firmware.bin` (size ≫ placeholder)
2. Install wizard → **ESP32-S3 DevKitC-1 (N16R8)** → confirm **no** camera toggle → map ≥1 sensor → flash
3. Serial: `Check-in OK`, `Sensor ds18b20 (temperature): …`, `Telemetry uploaded`
4. Dashboard shows real measurements; mis-wired sensors are absent from ingest (not dummy values)

## Related

- ESP32-S3 CAM (real sensors + optional camera): [`docs/esp32-s3-cam-firmware.md`](esp32-s3-cam-firmware.md)
- ESP8266 (stub sensors): [`firmware/esp-8266-d1-mini/`](../firmware/esp-8266-d1-mini/)
