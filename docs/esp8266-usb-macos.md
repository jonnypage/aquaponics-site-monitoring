# ESP8266 USB on macOS (drivers + Web Serial)

Use this when the install wizard **Connect** button works but **no serial port** appears in Chrome’s picker, or `ls /dev/cu.*` shows nothing new with the board plugged in.

## 1. Identify the USB chip

Unplug the board. Plug it in and look at the small IC near the USB connector (often labeled):

| Marking on chip | Driver family |
|-----------------|---------------|
| **CP2102**, **CP2104**, Silicon Labs | CP210x |
| **CH340**, **CH341**, **CH9102** | WCH CH34x |

NodeMCU / D1 mini clones vary — check the chip, not the board name.

## 2. Install the matching driver

### CP2102 / CP2104 (Silicon Labs)

1. Download **CP210x VCP Mac OSX Driver** from [Silicon Labs USB to UART drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).
2. Open the `.dmg`, run **Install CP210x VCP Driver**.
3. If macOS blocks it: **System Settings → Privacy & Security** → **Allow** for Silicon Labs → restart Mac.

### CH340 / CH341 (WCH)

1. Download **CH341SER_MAC** from [WCH downloads](https://www.wch.cn/downloads/CH341SER_MAC_ZIP.html) (or search “CH340 macOS driver WCH”).
2. Run the `.pkg` installer.
3. If blocked: **Privacy & Security → Allow** for Jiangsu Qinheng / WCH → **restart Mac** (required for many versions).

macOS does **not** include CH340 drivers by default. CP210x sometimes works without a separate install on newer macOS, but installing the official package is still recommended if no port appears.

## 3. Verify macOS sees the port

1. Plug in the ESP8266 via a **data** USB cable (not charge-only).
2. In Terminal:

```bash
# Before plug-in
ls /dev/cu.*

# After plug-in — look for a NEW name, e.g.:
#   /dev/cu.SLAB_USBtoUART      (CP210x)
#   /dev/cu.wchusbserial1410    (CH340)
ls /dev/cu.* | sort
```

3. Optional: **System Information → USB** — device with Vendor ID **0x10C4** (Silicon Labs) or **0x1A86** (WCH).

If nothing new appears after driver install + restart, try another cable, USB port, or board.

## 4. macOS port vs Chrome picker

Terminal may show:

```text
/dev/cu.usbserial-A5069RR4
```

In Chrome’s Web Serial dialog, pick the **USB serial** entry with a similar name — **not** `Bluetooth-Incoming-Port` or `debug-console`.

On the install **Flash device** step, click **Connect and flash firmware** — Chrome opens the Web Serial port picker, then esp-web-tools flashes the device.

If Terminal has `usbserial` but Chrome’s list is **empty**:

```bash
# See what process is using the port (quit that app)
lsof | grep -i usbserial
```

Quit **Arduino IDE**, `screen`, VS Code serial monitors, etc., then try again.

If **no dialog appears** when clicking **Connect and flash firmware**, confirm in DevTools console:

```js
({ secure: window.isSecureContext, serial: "serial" in navigator, origin: location.origin })
```

All must be true on `http://localhost:3333`.

## 5. Flash from the dashboard (Chrome)

1. Open **`http://localhost:3333`** (not a `192.168.x.x` URL).
2. **Google Chrome** or **Microsoft Edge** (not Safari / Firefox / Arc).
3. Admin → **Devices** → device → **Install** → fill Wi‑Fi + GPIO → **Continue to flash**.
4. Click **Connect and flash firmware** → port picker should list the `/dev/cu.*` device above.
5. Select it and follow esp-web-tools prompts.

## 6. Still no port in Chrome?

| Check | Action |
|-------|--------|
| Driver not approved | Privacy & Security → Allow → restart |
| Wrong chip driver | Identify chip again; install the other family |
| Cable / port | Different USB cable and port |
| Board in flash-only mode | Hold **FLASH**, tap **RST**, release **FLASH**, retry Connect |
| Another app using serial | Quit Arduino IDE, screen, minicom |

## 7. After flash

Point firmware `apiOrigin` at your API (installer sets this). For local dev use `http://localhost:4000` or your machine’s LAN IP if the ESP is on Wi‑Fi — the device must reach the API, not the web app port.

Build a real firmware binary before hardware flash (`firmware.bin` is **not in git**):

```bash
pnpm firmware:build
```

`pnpm dev:web` auto-creates a **placeholder** if the file is missing (installer UI only). Use a PlatformIO build for on-device telemetry.
