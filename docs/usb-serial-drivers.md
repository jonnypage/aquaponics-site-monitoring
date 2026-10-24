# USB serial drivers (Windows + macOS)

Which USB-serial driver a board needs depends on the **USB bridge chip**, not the board name. Identify the chip from how the port shows up, then use the table below. Chrome’s Web Serial picker names come from the chip’s USB product string, so they can differ from Device Manager names.

## Chips seen on our boards

| Chip | Chrome picker name | macOS port | Windows Device Manager name | macOS driver | Windows driver |
| ---- | ------------------ | ---------- | --------------------------- | ------------ | -------------- |
| **FTDI FT232R** (some USB-C D1 mini clones) | `FT232R USB UART` | `/dev/cu.usbserial-<serial>` | `USB Serial Port (COMx)` | Built in (no install) | Auto-installs via Windows Update (internet required). Manual: FTDI **VCP** driver from ftdichip.com |
| **WCH CH343** (ESP32-S3 DevKitC-1 UART port) | `USB Single Serial` | `/dev/cu.usbmodem<id>` | `USB-Enhanced-SERIAL CH343` | Built in (CDC) | **CH343SER** — bundled with the dashboard (see below) |
| **ESP32-S3 native USB** (port labeled “USB”) | USB JTAG/serial debug unit | `/dev/cu.usbmodem<id>` | USB Serial Device / JTAG | Built in | Usually built in |
| **CP2102 / CP2104** | CP210x UART Bridge | `/dev/cu.SLAB_USBtoUART` or `usbserial-*` | Silicon Labs CP210x | Often built in; else Silicon Labs VCP driver | Usually auto-installs; else Silicon Labs VCP driver |
| **CH340 / CH341** (typical D1 mini clones) | USB Serial | `/dev/cu.wchusbserial*` | USB-SERIAL CH340 | Recent macOS includes it; older: WCH driver | Usually auto-installs; else WCH CH341SER |

You only need the packages for chips you actually have. A board can work with no manual install.

## Bundled CH343 driver (Windows)

To avoid sending users to third-party download sites, the WCH CH343 Windows driver is shipped with the web app:

| Item | Value |
| ---- | ----- |
| File | `apps/web/public/drivers/ch343-ser.zip` |
| URL | `/drivers/ch343-ser.zip` |
| Linked from | Admin → Devices → device → **Install** → **Flash the device** step (shown for all boards; Windows-only text) |
| Copy | `admin.devices.installFlashWindowsDriverHint` / `installFlashWindowsDriverLink` in `apps/web/src/locales/{en,es}.json` |

User steps: download, unzip, run `CH343SER/Driver/SETUP.EXE`. Windows may show a SmartScreen warning because the setup executables are not signed by this project.

Only the CH343 package is bundled. CP210x, FTDI, and CH340 drivers are not hosted by the app; those chips normally auto-install, and the vendor pages above cover the exceptions.

## Quick checks

**Windows:** Device Manager → **Ports (COM & LPT)**. A yellow warning icon under “Other devices” means a driver is missing.

**macOS:**

```bash
ls /dev/cu.*
```

Look for `usbserial`, `usbmodem`, `wchusbserial`, or `SLAB_USBtoUART`. Ignore `Bluetooth-Incoming-Port` and `debug-console`.

## No port appears

1. Use a **data** USB cable (many are charge-only).
2. Some USB-C boards omit CC resistors; try a USB-A to USB-C cable instead of C to C.
3. Close other apps holding the port (serial monitors, PlatformIO, Arduino IDE).
4. ESP32-S3 DevKitC-1 has two USB-C ports — try the other one.
5. macOS-specific steps: [`docs/esp8266-usb-macos.md`](esp8266-usb-macos.md).
