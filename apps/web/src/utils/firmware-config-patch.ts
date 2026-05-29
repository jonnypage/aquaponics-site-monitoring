export const CONFIG_BEGIN_MARKER = "__UD_CFG_BEGIN__";
export const CONFIG_END_MARKER = "__UD_CFG_END__";
export const CONFIG_REGION_SIZE = 2048;

import type { FirmwarePinsConfig } from "~/utils/sensor-wiring";
import type { SensorType } from "~/utils/sensor-types";

export interface FirmwareDeviceConfig {
  v: 3;
  deviceId: string;
  apiKey: string;
  apiOrigin: string;
  wifiSsid: string;
  wifiPassword: string;
  /** Per sensor: null = disabled; object = wire role id → GPIO; number = legacy v1 single pin. */
  pins: FirmwarePinsConfig;
  /** Per catalog key: measurement family for dummy/driver routing (null when disabled). */
  sensorTypes: Record<string, SensorType | null>;
  hasCamera: boolean;
}

export function estimateFirmwareConfigBytes(config: FirmwareDeviceConfig): number {
  return new TextEncoder().encode(JSON.stringify(config)).length;
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

/** Pick the widest BEGIN…END span (avoids false adjacency from truncated firmware markers). */
function findConfigPayloadBounds(haystack: Uint8Array): { payloadStart: number; payloadEnd: number } | null {
  const beginLen = encoder().encode(CONFIG_BEGIN_MARKER).length;
  let searchFrom = 0;
  let best: { payloadStart: number; payloadEnd: number; size: number } | null = null;

  while (searchFrom < haystack.length) {
    const beginIdx = findMarker(haystack, CONFIG_BEGIN_MARKER, searchFrom);
    if (beginIdx < 0) {
      break;
    }
    const endIdx = findMarker(haystack, CONFIG_END_MARKER, beginIdx + beginLen);
    if (endIdx > beginIdx) {
      const payloadStart = beginIdx + beginLen;
      const payloadEnd = endIdx;
      const size = payloadEnd - payloadStart;
      if (!best || size > best.size) {
        best = { payloadStart, payloadEnd, size };
      }
    }
    searchFrom = beginIdx + 1;
  }

  return best;
}

/** Patch the 2 KiB config region in a firmware binary. Pair with `createEspWebToolsManifestUrls` for flashing. */
export function patchFirmwareConfig(
  firmwareBytes: ArrayBuffer,
  config: FirmwareDeviceConfig
): { patched: Uint8Array } {
  const patched = new Uint8Array(firmwareBytes.slice(0));
  const bounds = findConfigPayloadBounds(patched);

  if (!bounds || bounds.payloadEnd <= bounds.payloadStart) {
    throw new Error(
      `Firmware binary is missing config markers ${CONFIG_BEGIN_MARKER} / ${CONFIG_END_MARKER}. Build firmware with pnpm firmware:build first.`
    );
  }

  const json = JSON.stringify(config);
  const jsonBytes = encoder().encode(json);
  const { payloadStart, payloadEnd } = bounds;
  const maxPayload = payloadEnd - payloadStart;

  if (maxPayload < 64) {
    throw new Error(
      `Firmware config region is too small (${maxPayload} bytes between markers). Rebuild with pnpm firmware:build.`
    );
  }

  if (jsonBytes.length > maxPayload) {
    throw new Error(`Config JSON (${jsonBytes.length} bytes) exceeds region (${maxPayload} bytes)`);
  }

  patched.fill(0, payloadStart, payloadEnd);
  patched.set(jsonBytes, payloadStart);

  return { patched };
}
