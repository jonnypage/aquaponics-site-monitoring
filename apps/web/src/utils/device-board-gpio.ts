/**
 * Per-board GPIO allowlists for the device install wizard.
 * Extend when adding boards (e.g. esp32-cyd).
 */

export const DEVICE_BOARD_IDS = ["esp8266", "esp32-cyd"] as const;
export type DeviceBoardId = (typeof DEVICE_BOARD_IDS)[number];

export type GpioBlockReason = "flash" | "boot" | "serial" | "out_of_range" | "board_unsupported";

export type GpioValidationLevel = "ok" | "warning" | "error";

export interface GpioValidation {
  level: GpioValidationLevel;
  reason: GpioBlockReason | "invalid" | "warning_gpio";
  gpio: number;
}

export interface DeviceBoardGpioProfile {
  id: DeviceBoardId;
  /** When false, install must not flash and any GPIO entry is rejected. */
  installSupported: boolean;
  allowed: readonly number[];
  /** Allowed but discouraged (shown as warning; does not block flash). */
  warned: readonly number[];
  forbidden: Readonly<Record<number, GpioBlockReason>>;
}

/** WeMos D1 mini / NodeMCU — GPIO numbers (not D-labels). */
const ESP8266_PROFILE: DeviceBoardGpioProfile = {
  id: "esp8266",
  installSupported: true,
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

/** Placeholder until CYD installer ships. */
const ESP32_CYD_PROFILE: DeviceBoardGpioProfile = {
  id: "esp32-cyd",
  installSupported: false,
  allowed: [],
  warned: [],
  forbidden: {}
};

const PROFILES: Record<DeviceBoardId, DeviceBoardGpioProfile> = {
  esp8266: ESP8266_PROFILE,
  "esp32-cyd": ESP32_CYD_PROFILE
};

export function getDeviceBoardGpioProfile(board: DeviceBoardId): DeviceBoardGpioProfile {
  return PROFILES[board];
}

export function formatAllowedGpioList(board: DeviceBoardId): string {
  const { allowed, warned, installSupported } = getDeviceBoardGpioProfile(board);
  if (!installSupported) {
    return "—";
  }
  const base = allowed.join(", ");
  const warn =
    warned.length > 0 ? `; caution: ${warned.join(", ")}` : "";
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
