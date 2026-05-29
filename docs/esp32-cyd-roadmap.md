# ESP32 CYD installer roadmap

**Status:** Deferred post–Phase 6 MVP. The install wizard now supports **ESP32-S3 CAM** instead — see [`docs/esp32-s3-cam-firmware.md`](esp32-s3-cam-firmware.md). The former `esp32-cyd` board stub was removed from [`apps/web/src/utils/device-board-gpio.ts`](../apps/web/src/utils/device-board-gpio.ts).

## Goal

Support **ESP32-2432S028 (CYD)** with the same admin install flow as ESP8266: Wi‑Fi + sensor GPIO map + optional camera flag, flashed via esp-web-tools in Chrome.

## Prerequisites (not started)

| Area | Work |
|------|------|
| Firmware tree | New PlatformIO project under `firmware/aquaponics-cyd/` (or env in a multi-board repo) |
| Config region | Reuse 2 KiB patch pattern (`__UD_CFG_BEGIN__` / `__UD_CFG_END__`) or CYD-specific layout |
| Installer binary | Build output → `apps/web/public/firmware/esp32-cyd/firmware.bin` (gitignored) |
| esp-web-tools manifest | Extend [`esp-web-manifest-blobs.ts`](../apps/web/src/utils/esp-web-manifest-blobs.ts) with `chipFamily: "ESP32"` and correct flash offsets |
| GPIO profile | Fill `ESP32_CYD_PROFILE` in `device-board-gpio.ts` (`installSupported: true`, allowlist + forbidden pins) |
| Web install | Enable board `<option>`; load correct public `firmware.bin` path per board |
| Camera | CYD has built-in display/camera options — align with `hasCamera` and snapshot ingest (likely still stub or board-specific driver) |

## Out of scope until this roadmap is executed

- Flashing CYD from production today (use ESP8266 or ESP32-S3 CAM).
- Sharing one `firmware.bin` between boards.

## References

- ESP32-S3 CAM (live): [`docs/esp32-s3-cam-firmware.md`](esp32-s3-cam-firmware.md)
- Phase 6 ESP8266: [`firmware/esp-8266-d1-mini/`](../firmware/esp-8266-d1-mini/), [`docs/phase6-agent-prompt.md`](phase6-agent-prompt.md)
- USB on macOS: [`docs/esp8266-usb-macos.md`](esp8266-usb-macos.md) (drivers may differ for CYD USB-serial chips)
