/**
 * Per-board GPIO allowlists for the device install wizard.
 */

export const DEVICE_BOARD_IDS = ["esp8266", "esp32-s3", "esp32-s3-cam"] as const;
export type DeviceBoardId = (typeof DEVICE_BOARD_IDS)[number];

export type EspWebToolsChipFamily = "ESP8266" | "ESP32-S3";

export type EspWebFlashPart = {
  /** Public path to static binary (under apps/web/public). */
  publicPath: string;
  offset: number;
  /** Install wizard patches this part in memory before flash. */
  patchable?: boolean;
};

export type GpioBlockReason = "flash" | "boot" | "serial" | "out_of_range" | "board_unsupported";

export type GpioValidationLevel = "ok" | "warning" | "error";

export interface GpioValidation {
  level: GpioValidationLevel;
  reason: GpioBlockReason | "invalid" | "warning_gpio";
  gpio: number;
}

export interface DeviceBoardGpioProfile {
  id: DeviceBoardId;
  labelKey: string;
  /** When false, install must not flash and any GPIO entry is rejected. */
  installSupported: boolean;
  /** When false, hide camera/snapshot UI and force hasCamera false in flashed config. */
  supportsCamera: boolean;
  /** Public path to firmware.bin (ESP8266 merged image). */
  firmwarePublicPath: string;
  /** ESP32 multi-part esp-web-tools layout (bootloader + partitions + app). */
  espWebFlashParts?: readonly EspWebFlashPart[];
  chipFamily: EspWebToolsChipFamily;
  manifestName: string;
  allowed: readonly number[];
  /** Allowed but discouraged (shown as warning; does not block flash). */
  warned: readonly number[];
  forbidden: Readonly<Record<number, GpioBlockReason>>;
}

/** WeMos D1 mini / NodeMCU — GPIO numbers (not D-labels). */
const ESP8266_PROFILE: DeviceBoardGpioProfile = {
  id: "esp8266",
  labelKey: "admin.devices.installBoardEsp8266",
  installSupported: true,
  supportsCamera: true,
  firmwarePublicPath: "/firmware/esp8266/firmware.bin",
  chipFamily: "ESP8266",
  manifestName: "esp-8266-d1-mini",
  allowed: [4, 5, 12, 13, 14, 17],
  warned: [16],
  forbidden: {
    0: "boot",
    1: "serial",
    2: "boot",
    3: "serial",
    6: "flash",
    7: "flash",
    8: "flash",
    9: "flash",
    10: "flash",
    11: "flash",
    15: "boot"
  }
};

/** ESP32-S3-DevKitC-1 N16R8 — telemetry only, no camera. */
const ESP32_S3_DEVKIT_PROFILE: DeviceBoardGpioProfile = {
  id: "esp32-s3",
  labelKey: "admin.devices.installBoardEsp32S3",
  installSupported: true,
  supportsCamera: false,
  firmwarePublicPath: "/firmware/esp32-s3/firmware.app.bin",
  espWebFlashParts: [
    { publicPath: "/firmware/esp32-s3/bootloader.bin", offset: 0x0 },
    { publicPath: "/firmware/esp32-s3/partitions.bin", offset: 0x8000 },
    { publicPath: "/firmware/esp32-s3/boot_app0.bin", offset: 0xe000 },
    { publicPath: "/firmware/esp32-s3/firmware.app.bin", offset: 0x10000, patchable: true }
  ],
  chipFamily: "ESP32-S3",
  manifestName: "esp32-s3",
  allowed: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 47, 48],
  warned: [2],
  forbidden: {
    0: "boot",
    3: "boot",
    19: "serial",
    20: "serial",
    26: "flash",
    27: "flash",
    28: "flash",
    29: "flash",
    30: "flash",
    31: "flash",
    32: "flash",
    33: "flash",
    34: "flash",
    35: "flash",
    36: "flash",
    37: "flash",
    43: "serial",
    44: "serial",
    45: "boot",
    46: "flash"
  }
};

/** AliExpress ESP32-S3 CAM (OV3660) — header-safe GPIOs from seller pinout. */
const ESP32_S3_CAM_PROFILE: DeviceBoardGpioProfile = {
  id: "esp32-s3-cam",
  labelKey: "admin.devices.installBoardEsp32S3Cam",
  installSupported: true,
  supportsCamera: true,
  firmwarePublicPath: "/firmware/esp32-s3-cam/firmware.app.bin",
  espWebFlashParts: [
    { publicPath: "/firmware/esp32-s3-cam/bootloader.bin", offset: 0x0 },
    { publicPath: "/firmware/esp32-s3-cam/partitions.bin", offset: 0x8000 },
    { publicPath: "/firmware/esp32-s3-cam/boot_app0.bin", offset: 0xe000 },
    { publicPath: "/firmware/esp32-s3-cam/firmware.app.bin", offset: 0x10000, patchable: true }
  ],
  chipFamily: "ESP32-S3",
  manifestName: "esp32-s3-cam",
  /** Broken out on board headers — not camera / SD / USB / PSRAM / JTAG. */
  allowed: [1, 14, 21, 47],
  /** On-board LED (GPIO2) — usable but may skew digital/ADC readings. */
  warned: [2],
  forbidden: {
    0: "boot",
    3: "boot",
    4: "flash",
    5: "flash",
    6: "flash",
    7: "flash",
    8: "flash",
    9: "flash",
    10: "flash",
    11: "flash",
    12: "flash",
    13: "flash",
    15: "flash",
    16: "flash",
    17: "flash",
    18: "flash",
    19: "serial",
    20: "serial",
    35: "flash",
    36: "flash",
    37: "flash",
    38: "flash",
    39: "flash",
    40: "flash",
    41: "flash",
    42: "flash",
    43: "serial",
    44: "serial",
    45: "boot",
    46: "flash",
    48: "flash"
  }
};

const PROFILES: Record<DeviceBoardId, DeviceBoardGpioProfile> = {
  esp8266: ESP8266_PROFILE,
  "esp32-s3": ESP32_S3_DEVKIT_PROFILE,
  "esp32-s3-cam": ESP32_S3_CAM_PROFILE
};

export function getDeviceBoardGpioProfile(board: DeviceBoardId): DeviceBoardGpioProfile {
  return PROFILES[board];
}

export function isDeviceBoardId(value: string): value is DeviceBoardId {
  return (DEVICE_BOARD_IDS as readonly string[]).includes(value);
}

export function formatAllowedGpioList(board: DeviceBoardId): string {
  const { allowed, warned, installSupported } = getDeviceBoardGpioProfile(board);
  if (!installSupported) {
    return "—";
  }
  const base = allowed.join(", ");
  const warn = warned.length > 0 ? `; caution: ${warned.join(", ")}` : "";
  if (board === "esp8266") {
    return `${base} (A0 = 17)${warn}`;
  }
  return `${base}${warn}`;
}

export function parseGpioInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || String(n) !== trimmed) {
    return null;
  }
  return n;
}

export function validateGpioForBoard(board: DeviceBoardId, raw: string): GpioValidation | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }

  const profile = getDeviceBoardGpioProfile(board);
  if (!profile.installSupported) {
    const n = parseGpioInput(raw);
    return {
      level: "error",
      reason: "board_unsupported",
      gpio: n ?? -1
    };
  }

  const gpio = parseGpioInput(raw);
  if (gpio == null) {
    return { level: "error", reason: "invalid", gpio: -1 };
  }

  const forbiddenReason = profile.forbidden[gpio];
  if (forbiddenReason) {
    return { level: "error", reason: forbiddenReason, gpio };
  }

  if (profile.allowed.includes(gpio)) {
    return null;
  }

  if (profile.warned.includes(gpio)) {
    return { level: "warning", reason: "warning_gpio", gpio };
  }

  return { level: "error", reason: "out_of_range", gpio };
}

export interface InstallGpioIssue {
  sensorKey: string;
  wireLabel: string;
  validation: GpioValidation;
}

export function collectInstallGpioIssues(
  board: DeviceBoardId,
  entries: ReadonlyArray<{ sensorKey: string; wireLabel: string; raw: string; active: boolean }>
): InstallGpioIssue[] {
  const issues: InstallGpioIssue[] = [];
  for (const entry of entries) {
    if (!entry.active) {
      continue;
    }
    const validation = validateGpioForBoard(board, entry.raw);
    if (validation && validation.level !== "ok") {
      issues.push({
        sensorKey: entry.sensorKey,
        wireLabel: entry.wireLabel,
        validation
      });
    }
  }
  return issues;
}

export function hasBlockingInstallGpioIssues(
  board: DeviceBoardId,
  entries: ReadonlyArray<{ sensorKey: string; wireLabel: string; raw: string; active: boolean }>
): boolean {
  return collectInstallGpioIssues(board, entries).some((i) => i.validation.level === "error");
}
