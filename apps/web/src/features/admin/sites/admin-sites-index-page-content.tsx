import { Link } from "@tanstack/react-router";
import { AlertTriangle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useAdminSites } from "~/hooks/useAdmin";

export function AdminSitesIndexPageContent() {
  const { t } = useTranslation();
  const { data: sites, isLoading, isError, error } = useAdminSites();

  return (
    <>
      <PageHeader
        title={t("admin.hub.sitesTitle")}
        description={t("admin.hub.sitesDesc")}
        actions={
          <Button asChild>
            <Link to="/admin/sites/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.sites.newTitle")}
            </Link>
          </Button>
        }
      />
      <PageBackLink to="/admin">{t("admin.shared.backToAdmin")}</PageBackLink>
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
          {(sites ?? []).map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.latitude != null && s.longitude != null ? `${s.latitude}, ${s.longitude}` : "—"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/sites/$siteId/edit" params={{ siteId: s.id }}>
                    {t("admin.sites.editTitle")}
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
