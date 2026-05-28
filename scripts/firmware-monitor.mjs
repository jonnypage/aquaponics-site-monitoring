#!/usr/bin/env node
/**
 * Serial monitor at 115200 (matches firmware Serial.begin and platformio.ini).
 * Usage:
 *   pnpm firmware:monitor
 *   pnpm firmware:monitor -- -p /dev/cu.usbserial-XXXX
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const firmwareDir = path.join(root, "firmware/aquaponics-node");
const extraArgs = process.argv.slice(2);

const args = ["device", "monitor", "-b", "115200", ...extraArgs];

const child = spawn("pio", args, { cwd: firmwareDir, stdio: "inherit" });
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));
