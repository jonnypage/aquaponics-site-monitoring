#!/usr/bin/env node
/**
 * Writes gitignored stub firmware files (config markers only) for install-wizard dev.
 * Not runnable on hardware. For real devices: pnpm firmware:build
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boardsToBuild } from "./firmware-boards.mjs";

const BEGIN = "__UD_CFG_BEGIN__";
const END = "__UD_CFG_END__";
const REGION = 2048;

for (const board of boardsToBuild(process.argv.slice(2))) {
  const region = Buffer.alloc(REGION, 0);
  region.write(BEGIN, 0, "utf8");
  region.write(END, REGION - END.length, "utf8");

  if (board.webFlashParts) {
    await mkdir(board.publicDir, { recursive: true });
    for (const part of board.webFlashParts) {
      const image = Buffer.alloc(part.patchable ? board.placeholderSize : 4096, 0xff);
      if (part.patchable) {
        region.copy(image, board.placeholderOffset);
      }
      await writeFile(part.publicAbs, image);
      console.log(
        `Wrote placeholder ${part.publicAbs} (${image.length} bytes). Build real firmware before flashing devices.`
      );
    }
    continue;
  }

  const image = Buffer.alloc(board.placeholderSize, 0xff);
  region.copy(image, board.placeholderOffset);

  await mkdir(path.dirname(board.publicAbs), { recursive: true });
  await writeFile(board.publicAbs, image);
  console.log(
    `Wrote placeholder ${board.publicAbs} (${image.length} bytes). Build real firmware before flashing devices.`
  );
}
