/** Manifest JSON shape esp-web-tools fetches via `downloadManifest(manifestPath)`. */
export type EspWebToolsManifestJson = {
  name: string;
  version: string;
  new_install_prompt_erase?: boolean;
  builds: Array<{
    chipFamily: "ESP8266";
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

/**
 * esp-web-tools loads manifest + firmware by URL (not in-memory objects).
 * Use blob URLs so each install gets a device-specific patched binary.
 */
export function createEspWebToolsManifestUrls(
  patchedFirmware: Uint8Array,
  name: string
): EspWebToolsManifestUrls {
  const firmwareBlob = new Blob([patchedFirmware as BlobPart], { type: "application/octet-stream" });
  const firmwareUrl = URL.createObjectURL(firmwareBlob);

  const manifest: EspWebToolsManifestJson = {
    name,
    version: "1.0.0",
    new_install_prompt_erase: true,
    builds: [
      {
        chipFamily: "ESP8266",
        parts: [{ path: firmwareUrl, offset: 0 }]
      }
    ]
  };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  return {
    manifestUrl,
    revoke: () => {
      URL.revokeObjectURL(firmwareUrl);
      URL.revokeObjectURL(manifestUrl);
    }
  };
}
