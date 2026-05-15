import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";

import { I18nDocumentSync } from "~/components/i18n/i18n-document-sync";
import { i18n } from "~/i18n/i18n";
import { ThemeProvider } from "~/theme/theme-provider";
import { queryClient } from "./query-client";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <I18nDocumentSync />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
