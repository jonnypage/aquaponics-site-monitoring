import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AppProviders } from "~/app";
import appCss from "~/styles/tailwind.css?url";
import { loadRootContext } from "~/api/session";
import en from "~/locales/en.json";
import { THEME_BOOTSTRAP_INLINE } from "~/theme/theme-inline-bootstrap";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: en.meta.title }
    ],
    links: [{ rel: "stylesheet", href: appCss }]
  }),
  beforeLoad: loadRootContext,
  shellComponent: RootDocument
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_INLINE }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppProviders>
          <Outlet />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  );
}
