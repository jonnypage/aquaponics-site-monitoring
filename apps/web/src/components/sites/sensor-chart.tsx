import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { SensorIcon } from "~/components/sensor-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "~/components/ui/chart";
import { useSensorMeasurements } from "~/hooks/useAPI";
import { TimeRange } from "~/gql/generated/graphql";
import { formatChartTick, formatNumber } from "~/utils/format";

interface SensorChartProps {
  siteId: string;
  sensorKey: string;
  label: string;
  unit?: string;
  range: TimeRange;
  colorVar?: string;
  /** Lucide React export name from `sensor_catalog.icon` (PascalCase). */
  lucideIcon?: string | null;
  /** Matches site `pollIntervalSeconds` (device telemetry cadence). */
  refetchIntervalMs?: number;
}

type Point = { ts: number; value: number };

export function SensorChart({
  siteId,
  sensorKey,
  label,
  unit,
  range,
  colorVar = "var(--chart-1)",
  lucideIcon,
  refetchIntervalMs
}: SensorChartProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useSensorMeasurements(siteId, sensorKey, range, {
    refetchIntervalMs
  });

  const points: Point[] = useMemo(() => {
    if (!data) return [];
    return data
      .map((m) => ({ ts: new Date(m.takenAt).getTime(), value: m.value }))
      .sort((a, b) => a.ts - b.ts);
  }, [data]);

  const latest = points.length ? points[points.length - 1].value : null;
  const min = points.length ? Math.min(...points.map((p) => p.value)) : null;
  const max = points.length ? Math.max(...points.map((p) => p.value)) : null;

  const chartConfig: ChartConfig = {
    value: { label, color: `hsl(${colorVar})` }
  };

  const fillId = `fill-${sensorKey}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex min-w-0 flex-1 items-start gap-2 space-y-1">
          {lucideIcon ? <SensorIcon name={lucideIcon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /> : null}
          <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-medium">{label}</CardTitle>
          <CardDescription>
            {latest != null ? (
              <>
                <span className="text-2xl font-semibold text-foreground">{formatNumber(latest)}</span>
                {unit ? <span className="ml-1 text-sm text-muted-foreground">{unit}</span> : null}
                {min != null && max != null ? (
                  <span className="ml-3 text-xs text-muted-foreground">
                    {t("sensorChart.range", { min: formatNumber(min), max: formatNumber(max) })}
                  </span>
                ) : null}
              </>
            ) : isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <span className="text-xs">{t("sensorChart.noReadings")}</span>
            )}
          </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : isError ? (
          <p className="py-12 text-center text-sm text-destructive">
            {t("sensorChart.loadError", {
              message: error instanceof Error ? error.message : t("shared.unknownError")
            })}
          </p>
        ) : points.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("sensorChart.noReadingsInRange")}</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <AreaChart data={points} margin={{ left: 4, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tick={range !== TimeRange.Last_24H}
                tickFormatter={(v) => formatChartTick(new Date(v), "day")}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
                width={36}
              />
                <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.ts as number | undefined;
                      return ts ? new Date(ts).toLocaleString() : "";
                    }}
                    formatter={(value) => (
                      <span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatNumber(value as number)}
                        </span>
                        {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                fill={`url(#${fillId})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
