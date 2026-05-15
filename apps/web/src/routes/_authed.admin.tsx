import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireAdmin } from "~/api/session";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: AdminLayout
});

function AdminLayout() {
  return <Outlet />;
}
