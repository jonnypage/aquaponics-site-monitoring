/**
 * PlatformIO board targets → web public firmware paths.
 * Used by build/copy/placeholder/ensure scripts.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @typedef {{ file: string, buildArtifact: string, offset: number, patchable?: boolean }} WebFlashPart */

/** @type {Record<string, { id: string, pioDir: string, pioEnv: string, mergebin: boolean, buildArtifact: string, publicRel: string, webFlashParts?: WebFlashPart[], placeholderOffset: number, placeholderSize: number }>} */
export const FIRMWARE_BOARDS = {
  esp8266: {
    id: "esp8266",
    pioDir: "firmware/esp-8266-d1-mini",
    pioEnv: "d1_mini",
    mergebin: false,
    buildArtifact: ".pio/build/d1_mini/firmware.bin",
    publicRel: "apps/web/public/firmware/esp8266/firmware.bin",
    placeholderOffset: 64 * 1024,
    placeholderSize: 256 * 1024
  },
  "esp32-s3-cam": {
    id: "esp32-s3-cam",
    pioDir: "firmware/esp32-s3-cam",
    pioEnv: "esp32-s3-cam",
    mergebin: true,
    buildArtifact: ".pio/build/esp32-s3-cam/firmware.factory.bin",
    publicRel: "apps/web/public/firmware/esp32-s3-cam/firmware.bin",
    webFlashParts: [
      {
        file: "bootloader.bin",
        buildArtifact: ".pio/build/esp32-s3-cam/bootloader.bin",
        offset: 0x0
      },
      {
        file: "partitions.bin",
        buildArtifact: ".pio/build/esp32-s3-cam/partitions.bin",
        offset: 0x8000
      },
      {
        file: "boot_app0.bin",
        buildArtifact: ".pio/build/esp32-s3-cam/boot_app0.bin",
        offset: 0xe000
      },
      {
        file: "firmware.app.bin",
        buildArtifact: ".pio/build/esp32-s3-cam/firmware.bin",
        offset: 0x10000,
        patchable: true
      }
    ],
    placeholderOffset: 64 * 1024,
    placeholderSize: 512 * 1024
  }
};

export const FIRMWARE_BOARD_IDS = Object.keys(FIRMWARE_BOARDS);

export function resolveBoard(id) {
  const board = FIRMWARE_BOARDS[id];
  if (!board) {
    throw new Error(`Unknown firmware board "${id}". Valid: ${FIRMWARE_BOARD_IDS.join(", ")}`);
  }
  const publicDir = path.join(root, path.dirname(board.publicRel));
  const webFlashParts = board.webFlashParts?.map((part) => ({
    ...part,
    publicRel: path.join(path.dirname(board.publicRel), part.file),
    publicAbs: path.join(root, path.dirname(board.publicRel), part.file),
    buildArtifactAbs: path.join(root, board.pioDir, part.buildArtifact)
  }));
  return {
    ...board,
    pioDirAbs: path.join(root, board.pioDir),
    buildArtifactAbs: path.join(root, board.pioDir, board.buildArtifact),
    publicAbs: path.join(root, board.publicRel),
    publicDir,
    webFlashParts
  };
}

export function boardsToBuild(cliArgs) {
  if (cliArgs.length === 0) {
    return FIRMWARE_BOARD_IDS.map((id) => resolveBoard(id));
  }
  return cliArgs.map((id) => resolveBoard(id));
}
