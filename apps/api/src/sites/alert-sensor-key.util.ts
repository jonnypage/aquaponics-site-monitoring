/**
 * Map alert `type` strings to `sensor_catalog.key` / `site_sensor_catalog.sensor`, or `null` when
 * the alert is not scoped to a single catalog sensor (e.g. `device_offline`).
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
