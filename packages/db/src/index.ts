export { createDb } from "./client.js";
export type { Database, UserRole, User, NewUser, UserUpdate } from "./types.js";
export {
  DEFAULT_SENSOR_WIRING_TEMPLATE,
  normalizeSensorWiringTemplate,
  slugWireIdFromLabel,
  isValidWireColor,
  type SensorWireDef,
  type SensorWiringTemplate,
  type DevicePinMap,
  type FirmwarePinsConfig
} from "./sensor-wiring.js";
