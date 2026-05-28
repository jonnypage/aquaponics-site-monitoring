const PRESET_COLORS: Record<string, string> = {
  red: "#ef4444",
  black: "#171717",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  white: "#f5f5f5",
  orange: "#f97316",
  purple: "#a855f7",
  brown: "#92400e",
  gray: "#6b7280"
};

export const WIRE_COLOR_PRESETS = Object.keys(PRESET_COLORS) as Array<keyof typeof PRESET_COLORS>;

export const WIRE_COLOR_PRESET_ENTRIES = WIRE_COLOR_PRESETS.map((key) => ({
  key,
  hex: PRESET_COLORS[key]
}));

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isPresetWireColor(color: string): boolean {
  return WIRE_COLOR_PRESETS.includes(color.trim().toLowerCase() as (typeof WIRE_COLOR_PRESETS)[number]);
}

export function isHexWireColor(color: string): boolean {
  return HEX_COLOR_RE.test(color.trim());
}

/** Hex string for native `<input type="color">` (always #rrggbb). */
export function wireColorToPickerHex(color: string): string {
  const t = color.trim();
  if (isHexWireColor(t)) {
    return t.toLowerCase();
  }
  if (isPresetWireColor(t)) {
    return PRESET_COLORS[t.toLowerCase() as keyof typeof PRESET_COLORS];
  }
  return "#6b7280";
}

export function resolveWireColorCss(color: string): string {
  const t = color.trim();
  if (t.startsWith("#")) {
    return t;
  }
  return PRESET_COLORS[t.toLowerCase()] ?? "#6b7280";
}
