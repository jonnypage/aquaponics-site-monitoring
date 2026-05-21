/** Stable script id for `useJsApiLoader` so admin picker + site map share one Maps load. */
export const GOOGLE_MAPS_LOADER_ID = "aquaponics-google-maps";

export function getGoogleMapsBrowserKey(): string | undefined {
  const k = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  return k ? k : undefined;
}

/** String literal mapTypeId avoids referencing global `google` during SSR / module init. */
export const defaultGoogleMapOptions: google.maps.MapOptions = {
  mapTypeId: "hybrid",
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false
};
