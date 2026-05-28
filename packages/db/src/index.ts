export { createDb } from "./client.js";
export type { Database, UserRole, User, NewUser, UserUpdate } from "./types.js";
export {
  SENSOR_TYPES,
  DEFAULT_SENSOR_CATALOG_ROWS,
  isSensorType,
  type SensorType
} from "./sensor-types.js";
export {
  DEFAULT_SENSOR_WIRING_TEMPLATE,
  normalizeSensorWiringTemplate,
  slugWireIdFromLabel,
  isValidWireColor,
  sensorKeysWithPinsFromDeviceMap,
  type SensorWireDef,
  type SensorWiringTemplate,
  type DevicePinMap,
  type FirmwarePinsConfig
} from "./sensor-wiring.js";
