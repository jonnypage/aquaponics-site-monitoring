#!/usr/bin/env node
/**
 * Serial monitor at 115200 (matches firmware Serial.begin and platformio.ini).
 * Usage:
 *   pnpm firmware:monitor -- -p /dev/cu.usbmodemXXXX
 *   pnpm firmware:monitor:s3 -- -p /dev/cu.usbmodemXXXX
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveBoard } from "./firmware-boards.mjs";

const boardArg = process.argv[2];
const rawExtra =
  boardArg && !boardArg.startsWith("-") && boardArg !== "--" ? process.argv.slice(3) : process.argv.slice(2);
const boardId =
  boardArg && !boardArg.startsWith("-") && boardArg !== "--" ? boardArg : "esp8266";
const board = resolveBoard(boardId);

let monitorPort;
const forwarded = [];
for (let i = 0; i < rawExtra.length; i++) {
  const arg = rawExtra[i];
  if (arg === "--") {
    continue;
  }
  if (arg === "--port" || arg === "-p") {
    monitorPort = rawExtra[++i];
    continue;
  }
  forwarded.push(arg);
}

const args = ["device", "monitor", "-e", board.pioEnv, "-b", "115200", "--dtr", "0", "--rts", "0"];
if (monitorPort) {
  args.push("--port", monitorPort);
}
args.push(...forwarded);

const child = spawn("pio", args, { cwd: board.pioDirAbs, stdio: "inherit" });
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));
