# ESP32-S3 telemetry + camera firmware

Production firmware for **ESP32-S3** site nodes: real sensor drivers plus optional **OV3660** JPEG snapshots over `POST /ingest/snapshot`.

Firmware project: [`firmware/esp32-s3-cam/`](../firmware/esp32-s3-cam/README.md)

Public binary path: `apps/web/public/firmware/esp32-s3-cam/firmware.bin` (gitignored)

## Board compatibility

| Feature | Works on |
|---------|----------|
| Wi‑Fi, ingest, sensor drivers | **Any ESP32-S3** — map sensors to GPIOs allowed for your board in the install wizard |
| Camera snapshots | ESP32-S3 modules with **PSRAM** and an **OV3660** on the standard CAM DVP pinout in `src/camera.cpp` (DIYables / Freenove-class ESP32-S3 CAM boards) |

Generic ESP32-S3 dev kits without a camera: leave **Has camera** unchecked; telemetry still runs.

PlatformIO targets **`esp32-s3-devkitc-1`** with OPI PSRAM — tweak `platformio.ini` if your module differs.

## Install wizard

Admin → Devices → **Install** → select **ESP32-S3 CAM**. Same flow as ESP8266:

1. Patch 2 KiB JSON config region (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`)
2. Flash merged binary over USB via esp-web-tools (Chrome, secure context)

## Build

Requires [PlatformIO](https://platformio.org/) on PATH:

```bash
pnpm firmware:build:s3    # S3 only
pnpm firmware:build       # ESP8266 + S3
pnpm firmware:monitor:s3 -- -p /dev/cu.usbmodemXXXX
```

Build runs `pio run` then merges bootloader/partitions/app into `firmware.factory.bin` (flash offset 0 for esp-web-tools).

## Sensors (catalog keys)

| Key | Type | Notes |
|-----|------|-------|
| `ds18b20` | temperature | OneWire on `signal` GPIO |
| `bncPhModule` | ph | ADC on `signal`; default map pH 7 @ 2.5 V, ~0.18 V/pH — calibrate per module |
| `floatSwitch` | waterLevel | Digital input, pull-up; LOW = 100 % |
| `yfs201` | waterFlow | Pulse interrupt; 450 pulses/L |

Only sensors **included** in the install wizard (with valid GPIOs) are read. Disabled keys are omitted from ingest.

## Camera

When **Has camera** is enabled (flashed config or ingest `commands`):

- Captures **VGA JPEG** from the onboard OV3660
- Uploads on `snapshotIntervalSeconds` or when `captureImageNow` is set (same API contract as ESP8266)
- Requires object storage configured on the API (`OBJECT_STORAGE_*`)

If camera init fails at boot (wrong pinout or no PSRAM), firmware logs a warning and continues **without** snapshots.

## GPIO (AliExpress ESP32-S3 CAM pinout)

**Allowed for sensors:** 1, 14, 21, 47 — **caution:** 2 (on-board LED)

**Reserved:** camera 4–13 & 15–18, PSRAM 35–37, SD 38–40, USB 19–20, UART 43–44, JTAG 3/41–42, strapping 0/45, WS2812 48, LOG 46

Camera DVP in `firmware/esp32-s3-cam/src/camera.cpp` matches the seller pinout (SIOD 4, SIOC 5, VSYNC 6, HREF 7, Y2–Y9 on 8–12 & 16–18, PCLK 13, XCLK 15).

## pH calibration

Default firmware constants assume a typical analog pH module (mid-scale ≈ pH 7). For production sites, calibrate with buffer solutions and adjust constants in `firmware/esp32-s3-cam/src/sensors.cpp`.

## USB serial (macOS) — two ports

Many **ESP32-S3 CAM** boards expose **two USB connectors** (or one USB-C plus a separate UART header). They show up as **different** `/dev/cu.usbmodem*` devices:

| Port | Typical role | What you see at 115200 |
|------|----------------|-------------------------|
| **UART bridge** (CH340/CP2102 class) | Application `Serial` logs | `esp32-s3-cam starting`, Wi‑Fi, sensors, `Telemetry OK` |
| **Native USB** (chip USB/JTAG) | ROM boot + flash/download | Often **only** `ESP-ROM` / `entry 0x403c98d0`, then silence |

**Use the UART-bridge port** for `pnpm firmware:monitor:s3` and pick the **same** port in Chrome when flashing from the install wizard. If you open the wrong port, it looks like a boot loop or “no firmware” even when the device is healthy.

On macOS, list devices: `ls /dev/cu.usbmodem*`. After reset, the working port usually logs `rst:0x15 (USB_UART_CHIP_RESET)` and app output within a few seconds.

See [`docs/esp8266-usb-macos.md`](esp8266-usb-macos.md) for general serial troubleshooting.

## Verification checklist

1. `pnpm firmware:build` produces `public/firmware/esp32-s3-cam/firmware.bin` (size ≫ placeholder)
2. Install wizard → ESP32-S3 CAM → map ≥1 sensor → enable **Has camera** on a CAM board → flash
3. Serial: `esp32-s3-cam starting`, `Camera ready (OV3660)`, `Telemetry OK`, `Snapshot uploaded`
4. Dashboard shows real measurements and snapshot gallery rows

## Related

- ESP8266 (stub sensors + optional placekitten snapshots): [`firmware/esp-8266-d1-mini/`](../firmware/esp-8266-d1-mini/)
- ESP32 CYD (deferred): [`docs/esp32-cyd-roadmap.md`](esp32-cyd-roadmap.md)
