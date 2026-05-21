#!/usr/bin/env node
/**
 * Writes a stub firmware.bin with __UD_CFG_BEGIN__ / __UD_CFG_END__ markers for the
 * web installer patcher. Replace with a real PlatformIO build before production flash:
 *   cd firmware/aquaponics-node && pio run
 *   cp .pio/build/d1_mini/firmware.bin ../../apps/web/public/firmware/esp8266/firmware.bin
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BEGIN = "__UD_CFG_BEGIN__";
const END = "__UD_CFG_END__";
const REGION = 2048;
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps/web/public/firmware/esp8266/firmware.bin"
);

const region = Buffer.alloc(REGION, 0);
region.write(BEGIN, 0, "utf8");
region.write(END, REGION - END.length, "utf8");

// Stub image: config region at 64 KiB offset (installer only needs markers present).
const image = Buffer.alloc(256 * 1024, 0xff);
region.copy(image, 64 * 1024);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, image);
console.log(`Wrote placeholder ${OUT} (${image.length} bytes). Build real firmware before flashing devices.`);
