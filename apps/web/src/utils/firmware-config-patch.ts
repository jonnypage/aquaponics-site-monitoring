export const CONFIG_BEGIN_MARKER = "__UD_CFG_BEGIN__";
export const CONFIG_END_MARKER = "__UD_CFG_END__";
export const CONFIG_REGION_SIZE = 2048;

export interface FirmwareDeviceConfig {
  v: 1;
  deviceId: string;
  apiKey: string;
  apiOrigin: string;
  wifiSsid: string;
  wifiPassword: string;
  /** Per sensor key: GPIO pin number, or `null` to omit from firmware telemetry. */
  pins: Record<string, number | null>;
  hasCamera: boolean;
}

export interface EspWebToolsManifest {
  name: string;
  version?: string;
  new_install_prompt_erase?: boolean;
  builds: Array<{
    chipFamily: string;
    parts: Array<{
      path: string;
      offset: number;
      data: Uint8Array;
    }>;
  }>;
}

function encoder(): TextEncoder {
  return new TextEncoder();
}

function findMarker(haystack: Uint8Array, marker: string, start = 0): number {
  const needle = encoder().encode(marker);
  outer: for (let i = start; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}

/** Patch the 2 KiB config region in a firmware binary and return manifest for esp-web-tools. */
export function patchFirmwareConfig(
  firmwareBytes: ArrayBuffer,
  config: FirmwareDeviceConfig,
  firmwareName = "aquaponics-node"
): { patched: Uint8Array; manifest: EspWebToolsManifest } {
  const patched = new Uint8Array(firmwareBytes.slice(0));
  const beginIdx = findMarker(patched, CONFIG_BEGIN_MARKER);
  const endIdx = findMarker(patched, CONFIG_END_MARKER, beginIdx >= 0 ? beginIdx + 1 : 0);

  if (beginIdx < 0 || endIdx < 0 || endIdx <= beginIdx) {
    throw new Error(
      `Firmware binary is missing config markers ${CONFIG_BEGIN_MARKER} / ${CONFIG_END_MARKER}. Build firmware from firmware/aquaponics-node first.`
    );
  }

  const json = JSON.stringify(config);
  const jsonBytes = encoder().encode(json);
  const payloadStart = beginIdx + encoder().encode(CONFIG_BEGIN_MARKER).length;
  const payloadEnd = endIdx;
  const maxPayload = payloadEnd - payloadStart;

  if (jsonBytes.length > maxPayload) {
    throw new Error(`Config JSON (${jsonBytes.length} bytes) exceeds region (${maxPayload} bytes)`);
  }

  patched.fill(0, payloadStart, payloadEnd);
  patched.set(jsonBytes, payloadStart);

  const manifest: EspWebToolsManifest = {
    name: firmwareName,
    new_install_prompt_erase: true,
    builds: [
      {
        chipFamily: "ESP8266",
        parts: [
          {
            path: "firmware.bin",
            offset: 0,
            data: patched
          }
        ]
      }
    ]
  };

  return { patched, manifest };
}
