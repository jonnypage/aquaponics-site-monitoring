/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
  /** LAN API URL for device firmware only (ESP cannot use localhost). Falls back to VITE_PUBLIC_API_URL. */
  readonly VITE_DEVICE_API_ORIGIN?: string;
  /** Optional; enables admin site map picker per product spec. */
  readonly VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
