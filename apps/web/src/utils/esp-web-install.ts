export type EspWebInstallBlockReason = "insecure" | "no-serial";

export type EspWebInstallSupport =
  | { ok: true }
  | { ok: false; reason: EspWebInstallBlockReason; origin: string };

/** Client-only: Web Serial + secure context required by esp-web-tools. */
export function getEspWebInstallSupport(): EspWebInstallSupport {
  if (typeof window === "undefined") {
    return { ok: false, reason: "no-serial", origin: "" };
  }
  const origin = window.location.origin;
  if (!window.isSecureContext) {
    return { ok: false, reason: "insecure", origin };
  }
  if (!("serial" in navigator)) {
    return { ok: false, reason: "no-serial", origin };
  }
  return { ok: true };
}
