# esp32-s3-cam

PlatformIO firmware for **ESP32-S3** site nodes: real sensor telemetry plus optional **OV3660** JPEG snapshots. Not part of the pnpm workspace.

## Board compatibility

| Feature | Requirement |
|---------|-------------|
| **Telemetry + sensors** | Any ESP32-S3 with enough free GPIOs for your wiring map (install wizard validates per-board allowlist) |
| **Camera snapshots** | Same board family with **PSRAM** + **OV3660** on the DVP pins below (AliExpress ESP32-S3 CAM pinout) |

The PlatformIO target is **ESP32-S3 N16R8** (`board_build.arduino.memory_type = qio_opi`, OPI PSRAM). Camera pins match Espressif **`CAMERA_MODEL_ESP32S3_EYE`**.

Generic ESP32-S3 dev kits **without** PSRAM should not use this env as-is.

## GPIO (AliExpress ESP32-S3 CAM pinout)

**Safe for sensors (install wizard allowlist):** 1, 14, 21, 47

**Reserved — do not use for sensors:**

| Function | GPIO |
|----------|------|
| Camera DVP | 4–13, 15–18 (SIOD/SIOC, VSYNC/HREF/PCLK/XCLK, Y2–Y9) |
| PSRAM | 35–37 |
| microSD | 38–40 |
| USB | 19–20 |
| UART / TX-RX LEDs | 43–44 |
| JTAG | 3, 41–42 |
| Strapping | 0, 45 |
| WS2812 RGB | 48 |
| LOG | 46 |

Camera firmware pins in `src/camera.cpp` match the **Camera** row above.

Adjust [`apps/web/src/utils/device-board-gpio.ts`](../../apps/web/src/utils/device-board-gpio.ts) if your listing differs.

## Serial monitor (115200 baud)

**Two USB ports:** use the **UART bridge** `/dev/cu.usbmodem*` that prints `esp32-s3-cam starting` (not the port that only shows `ESP-ROM` lines). Same port for the admin install wizard in Chrome.

From repo root:

```bash
ls /dev/cu.usbmodem*
pnpm firmware:monitor:esp32:s3:cam -- -p /dev/cu.usbmodemXXXX
```

## Build

Requires [PlatformIO](https://platformio.org/). Produces a **merged** flash image for esp-web-tools:

```bash
pnpm firmware:build:esp32:s3:cam
```

Output: `apps/web/public/firmware/esp32-s3-cam/firmware.bin` (gitignored).

## Config region

Same 2 KiB patch slot as ESP8266 (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`), JSON **v3** from the admin install wizard, including **`hasCamera`**.

## Sensor drivers

| Catalog key | Driver |
|-------------|--------|
| `ds18b20` | OneWire + DallasTemperature on `signal` GPIO |
| `bncPhModule` | ADC on `signal` — default map: pH 7 @ 2.5 V, ~0.18 V/pH (calibrate in hardware doc) |
| `floatSwitch` | Digital input, pull-up — LOW = 100 % water level |
| `yfs201` | Pulse interrupt — 450 pulses/L → L/min over report interval |

Only sensors included in the flashed config are read; others are omitted from ingest.

## Camera

When `hasCamera` is true (flashed config or ingest `commands`), captures **VGA JPEG** from the onboard OV3660 and uploads via `POST /ingest/snapshot`. Respects `snapshotIntervalSeconds` and `captureImageNow` from ingest commands (same contract as ESP8266).

DVP pin map matches the AliExpress ESP32-S3 CAM seller pinout — see `src/camera.cpp` and the GPIO table in this README.

## HTTPS

Uses `setInsecure()` for MVP (same as ESP8266). Prefer HTTP on a trusted LAN for local testing.
