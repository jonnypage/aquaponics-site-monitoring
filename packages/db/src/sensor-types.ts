/** Measurement family for MVP sensors (heuristics + dashboard labels). */
export const SENSOR_TYPES = ["temperature", "ph", "waterLevel", "waterFlow"] as const;

export type SensorType = (typeof SENSOR_TYPES)[number];

export function isSensorType(value: string): value is SensorType {
  return (SENSOR_TYPES as readonly string[]).includes(value);
}

/** Default seed catalog rows (key, sensor_type, model, display_name, unit, physical_min, physical_max, sort_order, icon). */
export const DEFAULT_SENSOR_CATALOG_ROWS = [
  {
    key: "ds18b20",
    sensor_type: "temperature" as SensorType,
    model: "DS18B20",
    display_name: "Temperature",
    unit: "°C",
    physical_min: -40,
    physical_max: 60,
    sort_order: 1,
    icon: "Thermometer"
  },
  {
    key: "bncPhModule",
    sensor_type: "ph" as SensorType,
    model: "BNC pH module (0–14)",
    display_name: "pH",
    unit: "pH",
    physical_min: 0,
    physical_max: 14,
    sort_order: 2,
    icon: "FlaskConical"
  },
  {
    key: "floatSwitch",
    sensor_type: "waterLevel" as SensorType,
    model: "Right-angle float switch",
    display_name: "Water level",
    unit: "%",
    physical_min: 0,
    physical_max: 100,
    sort_order: 3,
    icon: "Gauge"
  },
  {
    key: "yfs201",
    sensor_type: "waterFlow" as SensorType,
    model: "Snvi YF-S201",
    display_name: "Water flow",
    unit: "L/min",
    physical_min: 0,
    physical_max: 500,
    sort_order: 4,
    icon: "Waves"
  }
] as const;
