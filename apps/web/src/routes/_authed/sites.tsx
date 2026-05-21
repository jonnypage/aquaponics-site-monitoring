import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pathless layout for `/sites` and `/sites/:siteId`.
 * Child routes render in `<Outlet />` (`sites/index.tsx`, `sites/$siteId.tsx`).
 */
export const Route = createFileRoute("/_authed/sites")({
  component: SitesLayout
});

function SitesLayout() {
  return <Outlet />;
}
