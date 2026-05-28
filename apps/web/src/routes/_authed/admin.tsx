import { createFileRoute, Outlet } from "@tanstack/react-router";

import { guardAdminRoute } from "~/api/session";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => guardAdminRoute(context),
  component: AdminLayout
});

function AdminLayout() {
  return <Outlet />;
}
