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

export type DevicePinMap = Record<string, Record<string, number> | null>;

/** Catalog sensor keys with at least one GPIO role saved on the device. */
export function sensorKeysWithPinsFromDeviceMap(
  pinMap: DevicePinMap | null | undefined
): string[] {
  if (pinMap == null) {
    return [];
  }
  return Object.entries(pinMap)
    .filter(([, roles]) => roles != null && Object.keys(roles).length > 0)
    .map(([key]) => key);
}

export type FirmwarePinsConfig = Record<string, number | null | Record<string, number | null>>;

const WIRE_ID_RE = /^[a-z][a-z0-9_]*$/;

export function slugWireIdFromLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const id = base.match(/^[a-z]/) ? base : `w_${base}`;
  return id.slice(0, 32) || "wire";
}

/** GraphQL / codegen may use `required: boolean | null`. */
export type SensorWiringTemplateInput = {
  wires: Array<{
    id: string;
    label: string;
    color: string;
    required?: boolean | null;
  }>;
  allowExtraWires?: boolean | null;
  maxExtraWires?: number | null;
};

export function normalizeWiringTemplateFromGraphql(
  raw: SensorWiringTemplateInput | SensorWiringTemplate | null | undefined
): SensorWiringTemplate {
  if (!raw?.wires?.length) {
    return {
      ...DEFAULT_SENSOR_WIRING_TEMPLATE,
      wires: [...DEFAULT_SENSOR_WIRING_TEMPLATE.wires]
    };
  }
  return {
    wires: raw.wires.map((w) => ({
      id: w.id,
      label: w.label,
      color: w.color,
      required: w.required !== false
    })),
    allowExtraWires: raw.allowExtraWires ?? false,
    maxExtraWires: raw.maxExtraWires ?? 2
  };
}

export function wiringTemplateForGraphql(template: SensorWiringTemplate) {
  return {
    wires: template.wires.map((w) => ({
      id: w.id,
      label: w.label,
      color: w.color,
      required: w.required !== false
    })),
    allowExtraWires: template.allowExtraWires ?? false,
    maxExtraWires: template.maxExtraWires ?? 2
  };
}

export function isValidWireId(id: string): boolean {
  return WIRE_ID_RE.test(id.trim());
}
