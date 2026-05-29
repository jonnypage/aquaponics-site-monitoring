# ESP8266 installer binary

`firmware.bin` is **not committed** (gitignored build output).

| Goal | Command |
|------|---------|
| Local dev / UI smoke (placeholder, not runnable on device) | `pnpm firmware:placeholder` |
| Auto-create if missing when starting web | `pnpm dev:web` (runs `firmware:ensure`) |
| Real device flash | `pnpm firmware:build` (from repo root) |

The admin install wizard loads `/firmware/esp8266/firmware.bin` from this folder.

See root [`README.md`](../../../../../README.md) (Firmware) and [`firmware/esp-8266-d1-mini/README.md`](../../../../../firmware/esp-8266-d1-mini/README.md).
