#!/usr/bin/env node
/**
 * PlatformIO upload for a firmware board target.
 * Usage:
 *   pnpm firmware:upload:s3 -- --upload-port /dev/cu.usbmodemXXXX
 *   pnpm firmware:upload:s3 -- -p /dev/cu.usbmodemXXXX
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveBoard } from "./firmware-boards.mjs";

const boardArg = process.argv[2];
const extraArgs = boardArg && !boardArg.startsWith("-") ? process.argv.slice(3) : process.argv.slice(2);
const boardId = boardArg && !boardArg.startsWith("-") ? boardArg : "esp32-s3-cam";
const board = resolveBoard(boardId);

let uploadPort;
const forwarded = [];
for (let i = 0; i < extraArgs.length; i++) {
  const arg = extraArgs[i];
  if (arg === "--upload-port" || arg === "-p") {
    uploadPort = extraArgs[++i];
    continue;
  }
  forwarded.push(arg);
}

const args = ["run", "-t", "upload", "-e", board.pioEnv];
if (uploadPort) {
  args.push("--upload-port", uploadPort);
}
args.push(...forwarded);

const child = spawn("pio", args, { cwd: board.pioDirAbs, stdio: "inherit" });
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));
