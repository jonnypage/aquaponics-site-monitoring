#!/usr/bin/env node
/**
 * PlatformIO build + copy to apps/web/public/firmware/{board}/firmware.bin
 * Usage:
 *   pnpm firmware:build              # all boards (ESP8266 + ESP32-S3 + ESP32-S3 CAM)
 *   pnpm firmware:build:esp32        # both ESP32-S3 targets
 *   pnpm firmware:build:esp32:s3     # ESP32-S3 DevKitC-1 only
 *   pnpm firmware:build:esp32:s3:cam # ESP32-S3 CAM only
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boardsToBuild } from "./firmware-boards.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliBoards = process.argv.slice(2);

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

for (const board of boardsToBuild(cliBoards)) {
  const pioArgs = ["run", "-e", board.pioEnv];
  console.log(`Building ${board.id} firmware (${pioArgs.join(" ")})…`);
  await run("pio", pioArgs, board.pioDirAbs);

  console.log(`Copying ${board.id} firmware.bin into web public path…`);
  await run(process.execPath, [path.join(root, "scripts/copy-firmware-build.mjs"), board.id], root);
}

console.log("Done. Re-flash from Admin → Devices → Install after firmware changes.");
