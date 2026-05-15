import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "~/components/layout/dashboard-shell";
import { requireAuth } from "~/api/session";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    requireAuth(context);
    return { user: context.user };
  },
  component: AuthedLayout
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <DashboardShell userName={user.name} userEmail={user.email}>
      <Outlet />
    </DashboardShell>
  );
}
