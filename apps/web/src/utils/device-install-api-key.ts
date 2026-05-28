const STORAGE_PREFIX = "aquaponics-device-install-key:";

function storageKey(deviceId: string): string {
  return `${STORAGE_PREFIX}${deviceId}`;
}

/** Plaintext device API key for firmware patching (session-only, never shown in UI). */
export function readDeviceInstallApiKey(deviceId: string): string | null {
  try {
    const value = sessionStorage.getItem(storageKey(deviceId));
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeDeviceInstallApiKey(deviceId: string, plainApiKey: string): void {
  try {
    sessionStorage.setItem(storageKey(deviceId), plainApiKey);
  } catch {
    // ignore quota / private mode
  }
}

export function clearDeviceInstallApiKey(deviceId: string): void {
  try {
    sessionStorage.removeItem(storageKey(deviceId));
  } catch {
    // ignore
  }
}
