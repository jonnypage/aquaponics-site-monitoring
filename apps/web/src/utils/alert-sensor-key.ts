/**
 * Map alert `type` strings to `sensor_catalog.key`, or `null` when not scoped to a single sensor.
 * Keep in sync with `apps/api/src/sites/alert-sensor-key.util.ts`.
 */
export function sensorCatalogKeyFromAlertType(type: string): string | null {
  const range = type.match(/^range_(?:warning|violation):(.+)$/);
  if (range?.[1]) {
    return range[1];
  }

  const heuristicToSensor: Record<string, string> = {
    temperature_spike: "temperature",
    temperature_flatline: "temperature",
    ph_drift: "ph",
    ph_flatline: "ph",
    water_level_issue: "waterLevel",
    water_level_flatline: "waterLevel",
    water_flow_issue: "waterFlow",
    water_flow_flatline: "waterFlow"
  };

  return heuristicToSensor[type] ?? null;
}
