import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SensorIcon } from "~/components/sensor-icon";

import { Badge } from "~/components/ui/badge";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertSeverity, AlertStatus } from "~/gql/generated/graphql";
import { useAlerts, useResolveAlertMutate, type ResolveAlertInput } from "~/hooks/useAPI";
import { useRelativeTimeTick } from "~/hooks/useRelativeTimeTick";
import { SITE_ALERTS_REFETCH_MS } from "~/utils/site-poll-interval";
import { sensorCatalogKeyFromAlertType, heuristicAlertSensorType } from "~/utils/alert-sensor-key";
import { formatAlertDisplay, type AlertReportingRow } from "~/utils/alert-display";
import type { SensorType } from "~/utils/sensor-types";
import { cn } from "~/utils/cn";
import { formatRelativeTime } from "~/utils/format";

function alertRowClassName(severity: AlertSeverity): string {
  if (severity === AlertSeverity.Critical) {
    return "border-destructive/40 bg-destructive/10";
  }
  return "border-amber-500/40 bg-amber-500/15";
}

interface SiteAlertsSectionProps {
  siteId: string;
  sensorReporting?: readonly AlertReportingRow[];
}

function lucideNameForAlertType(
  type: string,
  iconBySensorKey: ReadonlyMap<string, string | null | undefined>,
  iconBySensorType: ReadonlyMap<SensorType, string | null | undefined>
): string {
  if (type === "device_offline") {
    return "WifiOff";
  }
  const sk = sensorCatalogKeyFromAlertType(type);
  if (sk) {
    const icon = iconBySensorKey.get(sk);
    return icon?.trim() ? icon : "AlertTriangle";
  }
  const sensorType = heuristicAlertSensorType(type);
  if (sensorType) {
    const icon = iconBySensorType.get(sensorType);
    return icon?.trim() ? icon : "AlertTriangle";
  }
  return "AlertTriangle";
}

export function SiteAlertsSection({ siteId, sensorReporting }: SiteAlertsSectionProps) {
  const { t } = useTranslation();
  useRelativeTimeTick();
  const { data: alerts, isLoading, isError, error } = useAlerts(
    {
      siteId,
      status: AlertStatus.Active
    },
    { refetchIntervalMs: SITE_ALERTS_REFETCH_MS }
  );
  const {
    mutateAsync: resolveAlert,
    isPending: isResolving,
    variables: resolvingAlertId
  } = useResolveAlertMutate();

  const reportingRows = sensorReporting ?? [];

  const iconBySensorKey = useMemo(() => {
    const m = new Map<string, string | null | undefined>();
    for (const r of reportingRows) {
      m.set(r.sensorKey, r.icon);
    }
    return m;
  }, [reportingRows]);

  const iconBySensorType = useMemo(() => {
    const m = new Map<SensorType, string | null | undefined>();
    for (const r of reportingRows) {
      if (r.sensorType && r.icon?.trim()) {
        m.set(r.sensorType as SensorType, r.icon);
      }
    }
    return m;
  }, [reportingRows]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
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

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2.5 py-3">
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">{t("siteAlertsSection.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t("siteAlertsSection.title")}</CardTitle>
        <CardDescription>{t("siteAlertsSection.description")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-3">
          {list.map((a) => {
            const display = formatAlertDisplay(a, reportingRows, t);
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between",
                  alertRowClassName(a.severity)
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SensorIcon
                      name={lucideNameForAlertType(a.type, iconBySensorKey, iconBySensorType)}
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <Badge
                      variant={
                        a.severity === AlertSeverity.Critical ? "destructive" : "warning"
                      }
                    >
                      {a.severity === AlertSeverity.Critical
                        ? t("alertsPage.severity.critical")
                        : t("alertsPage.severity.warning")}
                    </Badge>
                    {display.deviceLabel ? (
                      <Badge variant="outline">{display.deviceLabel}</Badge>
                    ) : null}
                    <EntityKeyBadge className="text-muted-foreground">{a.type}</EntityKeyBadge>
                  </div>
                  <p className="text-sm text-foreground">{display.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("siteAlertsSection.updated", {
                      time: formatRelativeTime(new Date(a.updatedAt))
                    })}
                  </p>
                </div>
                {a.status === AlertStatus.Active ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={isResolving}
                    onClick={() =>
                      void resolveAlert({ id: a.id, siteId } satisfies ResolveAlertInput)
                    }
                  >
                    <ButtonPendingLabel pending={isResolving && resolvingAlertId?.id === a.id}>
                      {t("alertsPage.resolve")}
                    </ButtonPendingLabel>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
