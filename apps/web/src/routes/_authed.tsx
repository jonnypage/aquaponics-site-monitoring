import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { DashboardShell } from "~/components/layout/dashboard-shell";
import { LoadingIndicator } from "~/components/ui/loading-indicator";
import { guardAuthedRoute } from "~/api/session";
import { Role } from "~/gql/generated/graphql";
import { useMe } from "~/hooks/useAPI";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => guardAuthedRoute(context),
  component: AuthedLayout
});

function AuthedLayout() {
  const navigate = useNavigate();
  const { user: routeUser } = Route.useRouteContext();
  const { data: clientUser, isLoading, isFetched } = useMe();
  const user = routeUser ?? clientUser ?? null;

  useEffect(() => {
    if (isFetched && !isLoading && !user) {
      void navigate({ to: "/login", replace: true });
    }
  }, [isFetched, isLoading, navigate, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  const showAdminNav = user.role === Role.Admin;
  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      showAdminNav={showAdminNav}
    >
      <Outlet />
    </DashboardShell>
  );
}
