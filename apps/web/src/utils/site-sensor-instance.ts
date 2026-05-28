export function siteSensorInstanceKey(deviceId: string, sensorKey: string): string {
  return `${deviceId}:${sensorKey}`;
}
