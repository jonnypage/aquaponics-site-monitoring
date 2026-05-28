#!/usr/bin/env node
/**
 * PlatformIO build + copy to apps/web/public/firmware/esp8266/firmware.bin
 * Usage: pnpm firmware:build
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const firmwareDir = path.join(root, "firmware/aquaponics-node");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

console.log("Building ESP8266 firmware (pio run)…");
await run("pio", ["run"], firmwareDir);

console.log("Copying firmware.bin into web public path…");
await run(process.execPath, [path.join(root, "scripts/copy-firmware-build.mjs")], root);

console.log("Done. Re-flash from Admin → Devices → Install after C++ changes.");
