import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SensorIcon } from "~/components/sensor-icon";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertSeverity, AlertStatus } from "~/gql/generated/graphql";
import { useAlerts, useResolveAlertMutate } from "~/hooks/useAPI";
import { sensorCatalogKeyFromAlertType } from "~/utils/alert-sensor-key";
import { formatRelativeTime } from "~/utils/format";

interface SiteAlertsSectionProps {
  siteId: string;
  sensorReporting?: readonly { sensorKey: string; icon?: string | null }[];
}

function lucideNameForAlertType(
  type: string,
  iconBySensorKey: ReadonlyMap<string, string | null | undefined>
): string {
  if (type === "device_offline") {
    return "WifiOff";
  }
  const sk = sensorCatalogKeyFromAlertType(type);
  if (sk) {
    const icon = iconBySensorKey.get(sk);
    return icon?.trim() ? icon : "AlertTriangle";
  }
  return "AlertTriangle";
}

export function SiteAlertsSection({ siteId, sensorReporting }: SiteAlertsSectionProps) {
  const { t } = useTranslation();
  const { data: alerts, isLoading, isError, error } = useAlerts({
    siteId,
    status: AlertStatus.Active
  });
  const { mutateAsync: resolveAlert, isPending: isResolving } = useResolveAlertMutate();

  const iconBySensorKey = useMemo(() => {
    const m = new Map<string, string | null | undefined>();
    for (const r of sensorReporting ?? []) {
      m.set(r.sensorKey, r.icon);
    }
    return m;
  }, [sensorReporting]);

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mt-6 border-destructive/50">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("siteAlertsSection.loadError", {
            message: error instanceof Error ? error.message : t("shared.unknownError")
          })}
        </CardContent>
      </Card>
    );
  }

  const list = alerts ?? [];

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("siteAlertsSection.title")}</CardTitle>
          <CardDescription>{t("siteAlertsSection.description")}</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 self-start">
          <Link to="/alerts">{t("siteAlertsSection.viewAll")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("siteAlertsSection.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SensorIcon
                      name={lucideNameForAlertType(a.type, iconBySensorKey)}
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <Badge variant={a.severity === AlertSeverity.Critical ? "destructive" : "secondary"}>
                      {a.severity === AlertSeverity.Critical
                        ? t("alertsPage.severity.critical")
                        : t("alertsPage.severity.warning")}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{a.type}</span>
                  </div>
                  <p className="text-sm text-foreground">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("siteAlertsSection.updated", { time: formatRelativeTime(new Date(a.updatedAt)) })}
                  </p>
                </div>
                {a.status === AlertStatus.Active ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={isResolving}
                    onClick={() => void resolveAlert(a.id)}
                  >
                    <ButtonPendingLabel pending={isResolving}>{t("alertsPage.resolve")}</ButtonPendingLabel>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
