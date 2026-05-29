import type { SensorType } from "~/utils/sensor-types";

/** Parse device-scoped range alert types (`range_warning:deviceId:sensorKey`). */
export function rangeAlertPartsFromType(type: string): { deviceId: string; sensorKey: string } | null {
  const scoped = type.match(/^range_(?:warning|violation):([^:]+):(.+)$/);
  if (scoped?.[1] && scoped[2]) {
    return { deviceId: scoped[1], sensorKey: scoped[2] };
  }
  return null;
}

/** Keep in sync with `apps/api/src/sites/alert-sensor-key.util.ts`. */
export function sensorCatalogKeyFromAlertType(type: string): string | null {
  const scoped = rangeAlertPartsFromType(type);
  if (scoped != null) {
    return scoped.sensorKey;
  }

  const legacy = type.match(/^range_(?:warning|violation):(.+)$/);
  if (legacy?.[1]) {
    return legacy[1];
  }
  return null;
}

const HEURISTIC_BASE_TYPES: Record<string, SensorType> = {
  temperature_spike: "temperature",
  temperature_flatline: "temperature",
  ph_drift: "ph",
  ph_flatline: "ph",
  water_level_issue: "waterLevel",
  water_level_flatline: "waterLevel",
  water_flow_issue: "waterFlow",
  water_flow_flatline: "waterFlow"
};

function heuristicBaseType(type: string): string | null {
  const scoped = type.match(/^([a-z_]+):[^:]+$/);
  if (scoped?.[1] && HEURISTIC_BASE_TYPES[scoped[1]]) {
    return scoped[1];
  }
  if (HEURISTIC_BASE_TYPES[type]) {
    return type;
  }
  return null;
}

export function heuristicAlertSensorType(type: string): SensorType | null {
  const base = heuristicBaseType(type);
  return base ? (HEURISTIC_BASE_TYPES[base] ?? null) : null;
}

export function heuristicAlertDeviceId(type: string): string | null {
  const scoped = type.match(/^([a-z_]+):([^:]+)$/);
  if (scoped?.[1] && HEURISTIC_BASE_TYPES[scoped[1]] && scoped[2]) {
    return scoped[2];
  }
  return null;
}

/** Alert type for UI badges; device id is omitted when shown on its own pill. */
export function alertTypeDisplayLabel(type: string): string {
  const base = heuristicBaseType(type);
  if (base != null && type.startsWith(`${base}:`)) {
    return base;
  }
  const rangeScoped = type.match(/^(range_(?:warning|violation)):[^:]+:(.+)$/);
  if (rangeScoped?.[1] && rangeScoped[2]) {
    return `${rangeScoped[1]}:${rangeScoped[2]}`;
  }
  return type;
}
