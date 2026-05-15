import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "~/locales/en.json";
import es from "~/locales/es.json";

import { SUPPORTED_LANGUAGE_CODES } from "./supported-languages";

const resources = {
  en: { translation: en },
  es: { translation: es }
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
      fallbackLng: "en",
      resources,
      defaultNS: "translation",
      ns: ["translation"],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"]
      }
    });
}

export { i18n };
