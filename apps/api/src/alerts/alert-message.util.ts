export function deviceDisplayLabel(deviceId: string, name?: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : deviceId;
}
