import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { normalizeToSupportedLanguage } from "~/i18n/supported-languages";

/** Keeps `<html lang>` and `document.title` aligned with the active i18n language (client only). */
export function I18nDocumentSync() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const lng = normalizeToSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
    document.documentElement.lang = lng;
    document.title = t("meta.title");
  }, [i18n, i18n.language, i18n.resolvedLanguage, t]);

  return null;
}
