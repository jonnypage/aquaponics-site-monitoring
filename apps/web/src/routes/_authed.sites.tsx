import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pathless layout for `/sites` and `/sites/:siteId`.
 * Child routes render in `<Outlet />` (list is `_authed.sites.index`, detail is `_authed.sites.$siteId`).
 */
export const Route = createFileRoute("/_authed/sites")({
  component: SitesLayout
});

function SitesLayout() {
  return <Outlet />;
}
