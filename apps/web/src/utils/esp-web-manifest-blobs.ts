/** Manifest JSON shape esp-web-tools fetches via `downloadManifest(manifestPath)`. */
export type EspWebToolsManifestJson = {
  name: string;
  version: string;
  new_install_prompt_erase?: boolean;
  builds: Array<{
    chipFamily: string;
    parts: Array<{
      path: string;
      offset: number;
    }>;
  }>;
};

export type EspWebToolsManifestUrls = {
  manifestUrl: string;
  revoke: () => void;
};

export type EspWebToolsManifestPart = {
  /** Absolute or blob URL resolvable from the manifest URL. */
  url: string;
  offset: number;
};

export type EspWebToolsManifestOptions = {
  chipFamily: string;
  parts: EspWebToolsManifestPart[];
};

/**
 * esp-web-tools loads manifest + firmware by URL (not in-memory objects).
 * Pass blob URLs for patched parts and absolute URLs for static boot/partition binaries.
 */
export function createEspWebToolsManifestUrls(
  name: string,
  options: EspWebToolsManifestOptions
): EspWebToolsManifestUrls {
  const blobUrls = options.parts
    .map((part) => part.url)
    .filter((url) => url.startsWith("blob:"));

  const manifest: EspWebToolsManifestJson = {
    name,
    version: "1.0.0",
    new_install_prompt_erase: true,
    builds: [
      {
        chipFamily: options.chipFamily,
        parts: options.parts.map((part) => ({ path: part.url, offset: part.offset }))
      }
    ]
  };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const manifestUrl = URL.createObjectURL(manifestBlob);
  blobUrls.push(manifestUrl);

  return {
    manifestUrl,
    revoke: () => {
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
    }
  };
}

/** Single merged/part image at one offset (ESP8266). */
export function createEspWebToolsSinglePartManifestUrls(
  patchedFirmware: Uint8Array,
  name: string,
  options: { chipFamily: string; flashOffset?: number }
): EspWebToolsManifestUrls {
  const firmwareBlob = new Blob([patchedFirmware as BlobPart], { type: "application/octet-stream" });
  const firmwareUrl = URL.createObjectURL(firmwareBlob);
  return createEspWebToolsManifestUrls(name, {
    chipFamily: options.chipFamily,
    parts: [{ url: firmwareUrl, offset: options.flashOffset ?? 0 }]
  });
}
