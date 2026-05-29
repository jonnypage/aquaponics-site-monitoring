#!/usr/bin/env node
/**
 * Ensures public firmware placeholders exist for all boards (if missing).
 * Invoked by predev:web / prebuild:web. Real hardware: pnpm firmware:build
 */
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FIRMWARE_BOARD_IDS, resolveBoard } from "./firmware-boards.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function requiredPublicFiles(board) {
  if (board.webFlashParts) {
    return board.webFlashParts.map((part) => part.publicAbs);
  }
  return [board.publicAbs];
}

const missing = [];
for (const id of FIRMWARE_BOARD_IDS) {
  const board = resolveBoard(id);
  for (const file of requiredPublicFiles(board)) {
    try {
      await access(file);
    } catch {
      missing.push(id);
      break;
    }
  }
}

if (missing.length === 0) {
  process.exit(0);
}

console.log(`Missing firmware files for: ${[...new Set(missing)].join(", ")} — generating placeholders…`);

await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ["scripts/generate-firmware-placeholder.mjs", ...new Set(missing)],
    { cwd: root, stdio: "inherit" }
  );
  child.on("error", reject);
  child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`placeholder exit ${code}`))));
});
