/** Public API base URL baked into device firmware (from `VITE_PUBLIC_API_URL`). */
export function getPublicApiOrigin(): string {
  const url = import.meta.env.VITE_PUBLIC_API_URL;
  if (typeof url === "string" && url.trim()) {
    return url.trim().replace(/\/$/, "");
  }
  return "http://localhost:4000";
}
