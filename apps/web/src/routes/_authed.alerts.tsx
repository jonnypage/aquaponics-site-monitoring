import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AlertSeverity, AlertStatus, type GetAlertsQueryVariables } from "~/gql/generated/graphql";
import { useAlerts, useResolveAlertMutate, useSites } from "~/hooks/useAPI";
import { formatRelativeTime } from "~/utils/format";

export const Route = createFileRoute("/_authed/alerts")({
  component: AlertsPage
});

function AlertsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"active" | "all">("active");
  const variables: GetAlertsQueryVariables = useMemo(
    () => (tab === "active" ? { status: AlertStatus.Active } : {}),
    [tab]
  );

  const { data: sites } = useSites();
  const siteNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sites ?? []) {
      m.set(s.id, s.name);
    }
    return m;
  }, [sites]);

  const { data: alerts, isLoading, isError, error } = useAlerts(variables);
  const { mutateAsync: resolveAlert, isPending: isResolving } = useResolveAlertMutate();

  return (
    <>
      <PageHeader title={t("alertsPage.title")} description={t("alertsPage.description")} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "all")}>
          <TabsList>
            <TabsTrigger value="active">{t("alertsPage.tabs.active")}</TabsTrigger>
            <TabsTrigger value="all">{t("alertsPage.tabs.all")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <AlertsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("alertsPage.loadError", {
              message: error instanceof Error ? error.message : t("shared.unknownError")
            })}
          </CardContent>
        </Card>
      ) : !alerts?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("alertsPage.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.severity === AlertSeverity.Critical ? "destructive" : "secondary"}>
                      {a.severity === AlertSeverity.Critical
                        ? t("alertsPage.severity.critical")
                        : t("alertsPage.severity.warning")}
                    </Badge>
                    <Badge variant="outline">
                      {a.status === AlertStatus.Active ? t("alertsPage.status.active") : t("alertsPage.status.resolved")}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{a.type}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {t("alertsPage.site")}:{" "}
                      <Link to="/sites/$siteId" params={{ siteId: a.siteId }} className="text-primary underline-offset-4 hover:underline">
                        {siteNameById.get(a.siteId) ?? a.siteId}
                      </Link>
                    </span>
                    {a.deviceId ? (
                      <span>
                        {t("alertsPage.device")}: <span className="font-mono">{a.deviceId}</span>
                      </span>
                    ) : null}
                    <span>
                      {t("alertsPage.updated")}: {formatRelativeTime(new Date(a.updatedAt))}
                    </span>
                  </div>
                </div>
                {a.status === AlertStatus.Active ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 self-start"
                    disabled={isResolving}
                    onClick={() => void resolveAlert(a.id)}
                  >
                    <ButtonPendingLabel pending={isResolving}>{t("alertsPage.resolve")}</ButtonPendingLabel>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
