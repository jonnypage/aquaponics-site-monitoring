import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { AppProviders } from "~/app";
import appCss from "~/styles/tailwind.css?url";
import { loadRootContext } from "~/api/session";

export const Route = createRootRoute({
  beforeLoad: loadRootContext,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aquaponics monitoring" }
    ],
    links: [{ rel: "stylesheet", href: appCss }]
  }),
  shellComponent: RootDocument
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" className="font-semibold text-slate-800">
              Aquaponics
            </Link>
            <nav className="flex gap-3 text-sm">
              <Link to="/sites" className="text-emerald-700 hover:underline">
                Sites
              </Link>
              <Link to="/login" className="text-slate-600 hover:underline">
                Login
              </Link>
            </nav>
          </div>
        </header>
        <AppProviders>
          <Outlet />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  );
}
