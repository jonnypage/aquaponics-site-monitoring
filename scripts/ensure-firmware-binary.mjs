#!/usr/bin/env node
/**
 * Ensures apps/web/public/firmware/esp8266/firmware.bin exists (placeholder if missing).
 * Invoked by predev:web / prebuild:web. Real hardware: pio run && pnpm firmware:copy
 */
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const binPath = path.join(root, "apps/web/public/firmware/esp8266/firmware.bin");

try {
  await access(binPath);
  process.exit(0);
} catch {
  // fall through
}

console.log("firmware.bin missing — generating placeholder for install wizard…");

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/generate-firmware-placeholder.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  child.on("error", reject);
  child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`placeholder exit ${code}`))));
});
