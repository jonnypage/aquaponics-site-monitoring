function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** GraphQL / dashboard API (browser). Keep `localhost` when you open the web app on localhost. */
export function getPublicApiOrigin(): string {
  const url = import.meta.env.VITE_PUBLIC_API_URL;
  if (typeof url === "string" && url.trim()) {
    return normalizeOrigin(url);
  }
  return "http://localhost:4000";
}

/**
 * API URL baked into flashed firmware (`apiOrigin` in device config).
 * Use your machine's LAN IP so the ESP8266 can reach the API — not `localhost`.
 * Defaults to `VITE_PUBLIC_API_URL` when unset.
 */
export function getDeviceApiOrigin(): string {
  const device = import.meta.env.VITE_DEVICE_API_ORIGIN;
  if (typeof device === "string" && device.trim()) {
    return normalizeOrigin(device);
  }
  return getPublicApiOrigin();
}
