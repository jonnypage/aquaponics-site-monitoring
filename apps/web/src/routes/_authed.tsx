import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "~/components/layout/dashboard-shell";
import { requireAuth } from "~/api/session";
import { Role } from "~/gql/generated/graphql";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    requireAuth(context);
    return { user: context.user };
  },
  component: AuthedLayout
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const showAdminNav = user.role === Role.Admin;
  return (
    <DashboardShell userName={user.name} userEmail={user.email} showAdminNav={showAdminNav}>
      <Outlet />
    </DashboardShell>
  );
}
