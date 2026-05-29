#!/usr/bin/env node
/**
 * Copy PlatformIO build output into the web static path (gitignored).
 * Usage:
 *   node scripts/copy-firmware-build.mjs [boardId]
 *   pnpm firmware:copy -- esp32-s3-cam
 */
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { boardsToBuild } from "./firmware-boards.mjs";

const boardId = process.argv[2];
const boards = boardsToBuild(boardId ? [boardId] : []);

for (const board of boards) {
  try {
    await access(board.buildArtifactAbs);
  } catch {
    console.error(`Missing ${board.buildArtifactAbs}`);
    console.error(`Build first: pnpm firmware:build${boardId ? `:${boardId === "esp32-s3-cam" ? "s3" : boardId}` : ""}`);
    process.exit(1);
  }

  await mkdir(path.dirname(board.publicAbs), { recursive: true });
  await copyFile(board.buildArtifactAbs, board.publicAbs);
  console.log(`Copied ${board.buildArtifactAbs} → ${board.publicAbs}`);

  if (board.webFlashParts) {
    for (const part of board.webFlashParts) {
      try {
        await access(part.buildArtifactAbs);
      } catch {
        console.error(`Missing ${part.buildArtifactAbs}`);
        process.exit(1);
      }
      await copyFile(part.buildArtifactAbs, part.publicAbs);
      console.log(`Copied ${part.buildArtifactAbs} → ${part.publicAbs}`);
    }
  }
}
