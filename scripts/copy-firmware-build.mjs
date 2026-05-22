#!/usr/bin/env node
/**
 * Copy PlatformIO build output into the web static path (gitignored).
 * Run after: cd firmware/aquaponics-node && pio run
 */
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "firmware/aquaponics-node/.pio/build/d1_mini/firmware.bin");
const destDir = path.join(root, "apps/web/public/firmware/esp8266");
const dest = path.join(destDir, "firmware.bin");

try {
  await access(src);
} catch {
  console.error(`Missing ${src}`);
  console.error("Build first: cd firmware/aquaponics-node && pio run");
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log(`Copied ${src} → ${dest}`);
