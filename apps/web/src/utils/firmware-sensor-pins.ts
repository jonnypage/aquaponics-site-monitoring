import type { DevicePinMap, FirmwarePinsConfig, SensorWiringTemplate } from "~/utils/sensor-wiring";

export type { SensorWireDef, SensorWiringTemplate, DevicePinMap, FirmwarePinsConfig } from "~/utils/sensor-wiring";
export { DEFAULT_SENSOR_WIRING_TEMPLATE, slugWireIdFromLabel } from "~/utils/sensor-wiring";

export interface InstallExtraWire {
  id: string;
  label: string;
  color: string;
  gpio: string;
}

export interface InstallSensorRow {
  sensorKey: string;
  displayName: string;
  icon: string | null;
  sortOrder: number;
  siteEnabled: boolean;
  included: boolean;
  wiringTemplate: SensorWiringTemplate;
  wireMap: Record<string, string>;
  extraWires: InstallExtraWire[];
}

function parseGpio(s: string): number | null {
  const n = Number.parseInt(s.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function buildFirmwarePins(rows: InstallSensorRow[]): FirmwarePinsConfig {
  const pins: FirmwarePinsConfig = {};
  for (const row of rows) {
    if (!row.siteEnabled || !row.included) {
      pins[row.sensorKey] = null;
      continue;
    }
    const rolePins: Record<string, number | null> = {};
    for (const wire of row.wiringTemplate.wires) {
      const gpio = parseGpio(row.wireMap[wire.id] ?? "");
      rolePins[wire.id] = gpio;
    }
    for (const extra of row.extraWires) {
      const gpio = parseGpio(extra.gpio);
      if (gpio != null && extra.id.trim()) {
        rolePins[extra.id] = gpio;
      }
    }
    const hasAny = Object.values(rolePins).some((v) => v != null);
    pins[row.sensorKey] = hasAny ? rolePins : null;
  }
  return pins;
}

export function buildDevicePinMap(rows: InstallSensorRow[]): DevicePinMap {
  const map: DevicePinMap = {};
  for (const row of rows) {
    if (!row.siteEnabled || !row.included) {
      map[row.sensorKey] = null;
      continue;
    }
    const roles: Record<string, number> = {};
    for (const wire of row.wiringTemplate.wires) {
      const gpio = parseGpio(row.wireMap[wire.id] ?? "");
      if (gpio != null) {
        roles[wire.id] = gpio;
      }
    }
    for (const extra of row.extraWires) {
      const gpio = parseGpio(extra.gpio);
      if (gpio != null && extra.id.trim()) {
        roles[extra.id] = gpio;
      }
    }
    map[row.sensorKey] = Object.keys(roles).length > 0 ? roles : null;
  }
  return map;
}

/** All GPIO text fields for included sensors (for board allowlist validation). */
export function flattenInstallGpioEntries(
  rows: InstallSensorRow[]
): Array<{ sensorKey: string; wireLabel: string; raw: string; active: boolean }> {
  const entries: Array<{ sensorKey: string; wireLabel: string; raw: string; active: boolean }> =
    [];
  for (const row of rows) {
    if (!row.siteEnabled || !row.included) {
      continue;
    }
    for (const wire of row.wiringTemplate.wires) {
      entries.push({
        sensorKey: row.sensorKey,
        wireLabel: wire.label,
        raw: row.wireMap[wire.id] ?? "",
        active: true
      });
    }
    for (const extra of row.extraWires) {
      entries.push({
        sensorKey: row.sensorKey,
        wireLabel: extra.label,
        raw: extra.gpio,
        active: true
      });
    }
  }
  return entries;
}

export function hasIncludedPinnedSensor(rows: InstallSensorRow[]): boolean {
  return rows.some((row) => {
    if (!row.siteEnabled || !row.included) {
      return false;
    }
    for (const wire of row.wiringTemplate.wires) {
      if (wire.required === false) {
        continue;
      }
      if (parseGpio(row.wireMap[wire.id] ?? "") != null) {
        return true;
      }
    }
    return false;
  });
}

export function emptyWireMap(template: SensorWiringTemplate): Record<string, string> {
  const map: Record<string, string> = {};
  for (const w of template.wires) {
    map[w.id] = "";
  }
  return map;
}

export function applyPinMapToRow(
  row: InstallSensorRow,
  pinMap: DevicePinMap | null | undefined
): InstallSensorRow {
  if (!pinMap) {
    return row;
  }
  const saved = pinMap[row.sensorKey];
  if (saved == null || typeof saved !== "object") {
    return row;
  }
  const wireMap = { ...row.wireMap };
  const knownIds = new Set(row.wiringTemplate.wires.map((w) => w.id));
  const extraWires: InstallExtraWire[] = [];

  for (const [roleId, gpio] of Object.entries(saved)) {
    const gpioStr = String(gpio);
    if (knownIds.has(roleId)) {
      wireMap[roleId] = gpioStr;
    } else if (row.wiringTemplate.allowExtraWires) {
      extraWires.push({
        id: roleId,
        label: roleId,
        color: "#6b7280",
        gpio: gpioStr
      });
    }
  }

  return { ...row, wireMap, extraWires };
}
