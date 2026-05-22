import { useMemo, useState, type CSSProperties } from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { SiteAlertsSection } from '~/components/sites/site-alerts-section';
import { SiteLatestSnapshot } from '~/components/sites/site-latest-snapshot';
import { SiteLocationMap } from '~/components/sites/site-location-map';
import { SensorChart } from '~/components/sites/sensor-chart';
import { SiteStatusBadge } from '~/components/sites/site-status-badge';
import { TimeRangeTabs } from '~/components/sites/time-range-tabs';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TimeRange } from '~/gql/generated/graphql';
import { useSite } from '~/hooks/useAPI';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { formatRelativeTime } from '~/utils/format';
import { sitePollIntervalMs } from '~/utils/site-poll-interval';

const routeApi = getRouteApi('/_authed/sites/$siteId');

const CHART_COLOR_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;

export function SiteDetailPageContent() {
  const { t } = useTranslation();
  const { siteId } = routeApi.useParams();
  const { data: site, isLoading, isError, error } = useSite(siteId);
  const [range, setRange] = useState<TimeRange>(TimeRange.Last_24H);
  useRelativeTimeTick();

  const chartSensors = useMemo(() => {
    if (!site?.sensorReporting?.length) {
      return [];
    }
    return site.sensorReporting
      .filter((r) => r.enabled)
      .map((r, i) => ({
        sensorKey: r.sensorKey,
        label: r.displayName,
        unit: r.unit,
        icon: r.icon,
        colorVar: `var(${CHART_COLOR_VARS[i % CHART_COLOR_VARS.length]})`,
      }));
  }, [site?.sensorReporting]);

  if (isLoading) {
    return (
      <>
        <Skeleton className='mb-6 h-10 w-64' />
        <div className="grid w-full grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[260px] w-full min-w-0" />
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

      <div className="mb-6">
        <SiteAlertsSection
          siteId={site.id}
          sensorReporting={site.sensorReporting}
        />
      </div>

      <div className="mb-6">
        {chartSensors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("siteDetailPage.noEnabledSensors")}
          </p>
        ) : (
          <div
            className="grid w-full grid-cols-1 gap-4 md:[grid-template-columns:repeat(var(--sensor-cols),minmax(0,1fr))]"
            style={{ "--sensor-cols": chartSensors.length } as CSSProperties}
          >
            {chartSensors.map((s) => (
              <div key={s.sensorKey} className="min-w-0">
                <SensorChart
                  siteId={site.id}
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
        )}
      </div>

      <div
        className={
          site.latestSnapshot
            ? 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start'
            : 'mb-6'
        }
      >
        {site.latestSnapshot ? (
          <div className="min-w-0">
            <SiteLatestSnapshot
              imageUrl={site.latestSnapshot.imageUrl}
              takenAt={site.latestSnapshot.takenAt}
              deviceId={site.latestSnapshot.deviceId}
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <SiteLocationMap latitude={site.latitude} longitude={site.longitude} />
        </div>
      </div>
    </>
  );
}
