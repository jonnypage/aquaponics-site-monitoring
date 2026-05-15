import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Role } from "~/gql/generated/graphql";
import { useAdminUsers } from "~/hooks/useAdmin";

export const Route = createFileRoute("/_authed/admin/users/")({
  component: AdminUsersListPage
});

function roleLabel(role: Role): string {
  switch (role) {
    case Role.Admin:
      return "Admin";
    case Role.SiteManager:
      return "Site manager";
    case Role.SiteViewer:
      return "Site viewer";
    default:
      return role;
  }
}

function AdminUsersListPage() {
  const { t } = useTranslation();
  const { data: users, isLoading, isError, error } = useAdminUsers();

  return (
    <>
      <PageHeader
        title={t("admin.hub.usersTitle")}
        description={t("admin.hub.usersDesc")}
        actions={
          <Button asChild>
            <Link to="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.users.newTitle")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin" className="inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("admin.shared.backToAdmin")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("admin.shared.loadError", {
              message: error instanceof Error ? error.message : t("shared.unknownError")
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(u.role)} · {u.assignedSiteIds.length} {t("admin.users.sites").toLowerCase()}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/users/$userId/edit" params={{ userId: u.id }}>
                    {t("admin.users.editTitle")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
