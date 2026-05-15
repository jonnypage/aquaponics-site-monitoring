import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { SiteCard } from "~/components/sites/site-card";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useSites } from "~/hooks/useAPI";

export const Route = createFileRoute("/_authed/sites/")({
  component: SitesIndexPage
});

function SitesIndexPage() {
  const { t } = useTranslation();
  const { data: sites, isLoading, isError, error } = useSites();

  return (
    <>
      <PageHeader title={t("sitesPage.title")} description={t("sitesPage.description")} />
      {isLoading ? (
        <SitesGridSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("sitesPage.loadError", {
              message: error instanceof Error ? error.message : t("shared.unknownError")
            })}
          </CardContent>
        </Card>
      ) : !sites?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("sitesPage.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              id={site.id}
              name={site.name}
              status={site.status}
              lastUpdate={site.lastUpdate}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SitesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}
