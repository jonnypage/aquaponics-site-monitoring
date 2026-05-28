import type { SensorType } from "~/utils/sensor-types";
import { SENSOR_TYPES } from "~/utils/sensor-types";

export interface SensorDisplayLabelInput {
  sensorKey: string;
  sensorType: SensorType;
  model: string;
  displayName: string;
  deviceName?: string | null;
}

export function sensorTypeLabelKey(sensorType: SensorType): string {
  return `sensorType.${sensorType}`;
}

/** Dashboard chart title: family label; disambiguate with device name when duplicate types are enabled. */
export function sensorChartLabel(
  row: SensorDisplayLabelInput,
  enabledRows: readonly SensorDisplayLabelInput[],
  familyLabel: string
): string {
  const sameTypeCount = enabledRows.filter((r) => r.sensorType === row.sensorType).length;
  if (sameTypeCount <= 1) {
    return familyLabel;
  }

  const suffix =
    row.deviceName?.trim() ||
    row.model.trim() ||
    row.displayName.trim() ||
    row.sensorKey;
  return `${familyLabel} (${suffix})`;
}

/** Slug catalog key from hardware model (admin create form). */
export function slugSensorKeyFromModel(model: string): string {
  const parts = model
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "sensor";
  }

  const slug = parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  return slug.slice(0, 64) || "sensor";
}

export const SENSOR_TYPE_OPTIONS = SENSOR_TYPES;
