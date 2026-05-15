import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { SensorChart } from "~/components/sites/sensor-chart";
import { SiteStatusBadge } from "~/components/sites/site-status-badge";
import { TimeRangeTabs } from "~/components/sites/time-range-tabs";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { TimeRange } from "~/gql/generated/graphql";
import { useSite } from "~/hooks/useAPI";
import { formatRelativeTime } from "~/utils/format";

type SensorDef = { key: string; unit?: string; colorVar: string };

const SENSOR_DEFS: SensorDef[] = [
  { key: "temperature", unit: "°C", colorVar: "--chart-1" },
  { key: "ph", colorVar: "--chart-2" },
  { key: "waterLevel", unit: "cm", colorVar: "--chart-3" },
  { key: "waterFlow", unit: "L/min", colorVar: "--chart-4" }
];

export const Route = createFileRoute("/_authed/sites/$siteId")({
  component: SiteDetailPage
});

function SiteDetailPage() {
  const { t } = useTranslation();
  const { siteId } = Route.useParams();
  const { data: site, isLoading, isError, error } = useSite(siteId);
  const [range, setRange] = useState<TimeRange>(TimeRange.Last_24H);

  const sensors = useMemo(
    () =>
      SENSOR_DEFS.map((s) => ({
        ...s,
        label: t(`siteDetailPage.sensorLabels.${s.key}`)
      })),
    [t]
  );

  if (isLoading) {
    return (
      <>
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[260px] w-full" />
          ))}
        </div>
      </>
    );
  }

  if (isError || !site) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {t("siteDetailPage.loadError", {
            message: error instanceof Error ? error.message : t("siteDetailPage.notFound")
          })}
        </CardContent>
      </Card>
    );
  }

  const lastSeen = site.lastUpdate ? formatRelativeTime(new Date(site.lastUpdate)) : t("siteCard.noReadingsYet");

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link to="/sites">
          <ChevronLeft className="h-4 w-4" />
          {t("siteDetailPage.back")}
        </Link>
      </Button>

      <PageHeader
        title={site.name}
        description={t("siteDetailPage.lastReading", { time: lastSeen })}
        actions={
          <div className="flex items-center gap-3">
            <SiteStatusBadge status={site.status} />
            <TimeRangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sensors.map((s) => (
          <SensorChart
            key={s.key}
            siteId={site.id}
            sensorKey={s.key}
            label={s.label}
            unit={s.unit}
            range={range}
            colorVar={s.colorVar}
          />
        ))}
      </div>
    </>
  );
}
