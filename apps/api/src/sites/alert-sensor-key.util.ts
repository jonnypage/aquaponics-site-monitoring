import { SensorType as GqlSensorType } from "../sensors/sensor-type.types.js";

export type RangeAlertParts = {
  deviceId: string;
  sensorKey: string;
};

/** Parse device-scoped range alert types (`range_warning:deviceId:sensorKey`). */
export function rangeAlertPartsFromType(type: string): RangeAlertParts | null {
  const scoped = type.match(/^range_(?:warning|violation):([^:]+):(.+)$/);
  if (scoped?.[1] && scoped[2]) {
    return { deviceId: scoped[1], sensorKey: scoped[2] };
  }

  const legacy = type.match(/^range_(?:warning|violation):(.+)$/);
  if (legacy?.[1]) {
    return null;
  }
  return null;
}

/**
 * Map alert `type` strings to `sensor_catalog.key` for range alerts, or `null` when
 * the alert is not scoped to a single catalog key (e.g. `device_offline`, heuristics).
 */
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

const HEURISTIC_BASE_TYPES: Record<string, GqlSensorType> = {
  temperature_spike: GqlSensorType.temperature,
  temperature_flatline: GqlSensorType.temperature,
  ph_drift: GqlSensorType.ph,
  ph_flatline: GqlSensorType.ph,
  water_level_issue: GqlSensorType.waterLevel,
  water_level_flatline: GqlSensorType.waterLevel,
  water_flow_issue: GqlSensorType.waterFlow,
  water_flow_flatline: GqlSensorType.waterFlow
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

export function heuristicAlertDeviceId(type: string): string | null {
  const scoped = type.match(/^([a-z_]+):([^:]+)$/);
  if (scoped?.[1] && HEURISTIC_BASE_TYPES[scoped[1]] && scoped[2]) {
    return scoped[2];
  }
  return null;
}

/** Heuristic alert types are deduped per device + measurement family. */
export function heuristicAlertSensorType(type: string): GqlSensorType | null {
  const base = heuristicBaseType(type);
  return base ? (HEURISTIC_BASE_TYPES[base] ?? null) : null;
}

export function heuristicAlertBaseType(type: string): string | null {
  return heuristicBaseType(type);
}
