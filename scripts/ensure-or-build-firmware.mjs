#!/usr/bin/env node
/**
 * predev:web / prebuild:web hook.
 * - Local dev: placeholder if firmware.bin missing (fast, no PlatformIO).
 * - CI / Railway / FIRMWARE_BUILD=real: PlatformIO build + copy (runnable on device).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function wantsRealFirmware() {
  const v = process.env.FIRMWARE_BUILD?.trim().toLowerCase();
  if (v === "real" || v === "1" || v === "true") {
    return true;
  }
  if (process.env.CI === "true" || process.env.CI === "1") {
    return true;
  }
  if (process.env.RAILWAY_ENVIRONMENT) {
    return true;
  }
  return false;
}

function runNodeScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", scriptName)], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });
  });
}

if (wantsRealFirmware()) {
  console.log("FIRMWARE_BUILD=real (or CI/Railway) — building PlatformIO firmware…");
  try {
    await runNodeScript("build-firmware.mjs");
  } catch (e) {
    console.error(
      "Real firmware build failed. Ensure `pio` is on PATH (Railway: railpack.json buildAptPackages + scripts/railway-build-web.sh), or unset FIRMWARE_BUILD for a local placeholder."
    );
    throw e;
  }
} else {
  await runNodeScript("ensure-firmware-binary.mjs");
}
