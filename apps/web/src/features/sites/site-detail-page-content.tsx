import { useMemo, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { SiteAlertsSection } from '~/components/sites/site-alerts-section';
import { SiteLatestSnapshot } from '~/components/sites/site-latest-snapshot';
import { SiteLocationMap } from '~/components/sites/site-location-map';
import { SensorChart } from '~/components/sites/sensor-chart';
import { SiteStatusBadge } from '~/components/sites/site-status-badge';
import { TimeRangeTabs } from '~/components/sites/time-range-tabs';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TimeRange } from '~/gql/generated/graphql';
import { useSite } from '~/hooks/useAPI';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { formatRelativeTime } from '~/utils/format';
import {
  sensorChartLabel,
  sensorTypeLabelKey,
} from '~/utils/sensor-display-label';
import type { SensorType } from '~/utils/sensor-types';
import { sitePollIntervalMs } from '~/utils/site-poll-interval';

const routeApi = getRouteApi('/_authed/sites/$siteId');

const CHART_COLOR_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;

const SENSOR_GRID_CLASS =
  'grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function deviceLabel(deviceId: string, name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? `${trimmed}` : deviceId;
}

export function SiteDetailPageContent() {
  const { t } = useTranslation();
  const { siteId } = routeApi.useParams();
  const { data: site, isLoading, isError, error } = useSite(siteId);
  const [range, setRange] = useState<TimeRange>(TimeRange.Last_24H);
  useRelativeTimeTick();

  const enabledReporting = useMemo(
    () => (site?.sensorReporting ?? []).filter((r) => r.enabled),
    [site?.sensorReporting],
  );

  const chartSections = useMemo(() => {
    if (!enabledReporting.length) {
      return [];
    }

    const byDevice = new Map<string, typeof enabledReporting>();
    const deviceOrder: string[] = [];

    for (const row of enabledReporting) {
      if (!byDevice.has(row.deviceId)) {
        deviceOrder.push(row.deviceId);
        byDevice.set(row.deviceId, []);
      }
      byDevice.get(row.deviceId)!.push(row);
    }

    let colorIndex = 0;

    return deviceOrder.map((deviceId) => {
      const rows = byDevice.get(deviceId)!;
      const labelRows = rows.map((row) => ({
        sensorKey: row.sensorKey,
        sensorType: row.sensorType as SensorType,
        model: row.model,
        displayName: row.displayName,
        deviceName: row.deviceName,
      }));

      return {
        deviceId,
        deviceName: rows[0]?.deviceName,
        sensors: rows.map((r) => ({
          deviceId: r.deviceId,
          sensorKey: r.sensorKey,
          label: sensorChartLabel(
            {
              sensorKey: r.sensorKey,
              sensorType: r.sensorType as SensorType,
              model: r.model,
              displayName: r.displayName,
              deviceName: r.deviceName,
            },
            labelRows,
            t(sensorTypeLabelKey(r.sensorType as SensorType)),
          ),
          unit: r.unit,
          icon: r.icon,
          colorVar: `var(${
            CHART_COLOR_VARS[colorIndex++ % CHART_COLOR_VARS.length]
          })`,
        })),
      };
    });
  }, [enabledReporting, t]);

  if (isLoading) {
    return (
      <>
        <Skeleton className='mb-6 h-10 w-64' />
        <div className={SENSOR_GRID_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-[260px] w-full min-w-0' />
          ))}
        </div>
      </>
    );
  }

  if (isError || !site) {
    return (
      <Card>
        <CardContent className='flex items-center gap-3 py-6 text-sm text-destructive'>
          <AlertTriangle className='h-4 w-4' />
          {t('siteDetailPage.loadError', {
            message:
              error instanceof Error
                ? error.message
                : t('siteDetailPage.notFound'),
          })}
        </CardContent>
      </Card>
    );
  }

  const lastSeen = site.lastUpdate
    ? formatRelativeTime(new Date(site.lastUpdate))
    : t('siteCard.noReadingsYet');

  const pollIntervalMs = sitePollIntervalMs(site.pollIntervalSeconds);

  return (
    <>
      <PageBackLink to='/sites'>{t('siteDetailPage.back')}</PageBackLink>

      <PageHeader
        title={site.name}
        description={t('siteDetailPage.lastReading', { time: lastSeen })}
        actions={
          <div className='flex items-center gap-3'>
            <SiteStatusBadge status={site.status} />
            <TimeRangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      <div className='mb-6'>
        <SiteAlertsSection
          siteId={site.id}
          sensorReporting={site.sensorReporting}
        />
      </div>

      <div className='mb-6'>
        {chartSections.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {t('siteDetailPage.noEnabledSensors')}
          </p>
        ) : (
          <div className='space-y-8'>
            {chartSections.map((section) => (
              <section key={section.deviceId} className='space-y-4'>
                <FormSectionHeading>
                  {deviceLabel(section.deviceId, section.deviceName)}
                </FormSectionHeading>
                <div className={SENSOR_GRID_CLASS}>
                  {section.sensors.map((s) => (
                    <div
                      key={`${s.deviceId}:${s.sensorKey}`}
                      className='min-w-0'
                    >
                      <SensorChart
                        siteId={site.id}
                        deviceId={s.deviceId}
                        sensorKey={s.sensorKey}
                        label={s.label}
                        unit={s.unit}
                        range={range}
                        colorVar={s.colorVar}
                        lucideIcon={s.icon}
                        refetchIntervalMs={pollIntervalMs}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div
        className={
          site.recentSnapshots.length > 0
            ? 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start'
            : 'mb-6'
        }
      >
        {site.recentSnapshots.length > 0 ? (
          <div className='min-w-0'>
            <SiteLatestSnapshot
              snapshots={site.recentSnapshots.map((snap) => ({
                id: snap.id,
                imageUrl: snap.imageUrl,
                takenAt: snap.takenAt,
                deviceId: snap.deviceId,
                deviceName:
                  snap.deviceName ??
                  site.sensorReporting.find((r) => r.deviceId === snap.deviceId)
                    ?.deviceName,
              }))}
            />
          </div>
        ) : null}
        <div className='min-w-0'>
          <SiteLocationMap
            latitude={site.latitude}
            longitude={site.longitude}
          />
        </div>
      </div>
    </>
  );
}
