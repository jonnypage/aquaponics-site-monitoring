export const SUPPORTED_LANGUAGE_CODES = ["en", "es"] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export function normalizeToSupportedLanguage(lng: string | undefined): SupportedLanguageCode {
  const l = lng?.toLowerCase() ?? "";
  if (l.startsWith("es")) return "es";
  return "en";
}
