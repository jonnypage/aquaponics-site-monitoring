export interface SensorWireDef {
  id: string;
  label: string;
  color: string;
  required?: boolean;
}

export interface SensorWiringTemplate {
  wires: SensorWireDef[];
  allowExtraWires?: boolean;
  maxExtraWires?: number;
}

export const DEFAULT_SENSOR_WIRING_TEMPLATE: SensorWiringTemplate = {
  wires: [{ id: "signal", label: "Signal", color: "#3b82f6", required: true }],
  allowExtraWires: false,
  maxExtraWires: 2
};

const WIRE_ID_RE = /^[a-z][a-z0-9_]*$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const PRESET_COLORS = new Set([
  "red",
  "black",
  "yellow",
  "green",
  "blue",
  "white",
  "orange",
  "purple",
  "brown",
  "gray"
]);

export function isValidWireColor(color: string): boolean {
  const t = color.trim();
  return HEX_COLOR_RE.test(t) || PRESET_COLORS.has(t.toLowerCase());
}

export function normalizeSensorWiringTemplate(raw: unknown): SensorWiringTemplate {
  if (raw == null || typeof raw !== "object") {
    return { ...DEFAULT_SENSOR_WIRING_TEMPLATE, wires: [...DEFAULT_SENSOR_WIRING_TEMPLATE.wires] };
  }
  const o = raw as Record<string, unknown>;
  const wiresRaw = Array.isArray(o.wires) ? o.wires : [];
  const wires: SensorWireDef[] = [];
  const seen = new Set<string>();

  for (const item of wiresRaw) {
    if (item == null || typeof item !== "object") {
      continue;
    }
    const w = item as Record<string, unknown>;
    const id = typeof w.id === "string" ? w.id.trim() : "";
    const label = typeof w.label === "string" ? w.label.trim() : "";
    const color = typeof w.color === "string" ? w.color.trim() : "";
    if (!id || !WIRE_ID_RE.test(id) || !label || !isValidWireColor(color)) {
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    wires.push({
      id,
      label,
      color,
      required: w.required !== false
    });
  }

  if (wires.length === 0) {
    throw new Error("wiring_template must include at least one wire");
  }
  if (wires.length > 8) {
    throw new Error("wiring_template supports at most 8 wires");
  }

  const allowExtraWires = o.allowExtraWires === true;
  let maxExtraWires = 2;
  if (typeof o.maxExtraWires === "number" && Number.isFinite(o.maxExtraWires)) {
    maxExtraWires = Math.min(4, Math.max(0, Math.floor(o.maxExtraWires)));
  }

  return { wires, allowExtraWires, maxExtraWires };
}

export function slugWireIdFromLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const id = base.match(/^[a-z]/) ? base : `w_${base}`;
  return id.slice(0, 32) || "wire";
}

/** Device/firmware pin map: sensorKey → roleId → gpio or null sensor. */
export type DevicePinMap = Record<string, Record<string, number> | null>;

export type FirmwarePinsConfig = Record<string, number | null | Record<string, number | null>>;
