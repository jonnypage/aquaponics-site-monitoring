/** Keep aligned with `packages/db/src/sensor-types.ts` and GraphQL `SensorType`. */
export type SensorType = "temperature" | "ph" | "waterLevel" | "waterFlow";

export const SENSOR_TYPES: SensorType[] = ["temperature", "ph", "waterLevel", "waterFlow"];
