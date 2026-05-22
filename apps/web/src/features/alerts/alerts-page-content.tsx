import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlertCard } from '~/components/alerts/alert-card';
import { PageHeader } from '~/components/layout/page-header';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  AlertStatus,
  type GetAlertsQueryVariables,
} from '~/gql/generated/graphql';
import { useAlerts, useSites } from '~/hooks/useAPI';

export function AlertsPageContent() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const variables: GetAlertsQueryVariables = useMemo(
    () => (tab === 'active' ? { status: AlertStatus.Active } : {}),
    [tab],
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

  return (
    <>
      <PageHeader
        title={t('alertsPage.title')}
        description={t('alertsPage.description')}
      />
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'all')}>
          <TabsList>
            <TabsTrigger value='active'>
              {t('alertsPage.tabs.active')}
            </TabsTrigger>
            <TabsTrigger value='all'>{t('alertsPage.tabs.all')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <AlertsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className='flex items-center gap-3 py-6 text-sm text-destructive'>
            <AlertTriangle className='h-4 w-4 shrink-0' />
            {t('alertsPage.loadError', {
              message:
                error instanceof Error
                  ? error.message
                  : t('shared.unknownError'),
            })}
          </CardContent>
        </Card>
      ) : !alerts?.length ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            {t('alertsPage.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              siteName={siteNameById.get(a.siteId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function AlertsSkeleton() {
  return (
    <div className='space-y-3'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className='h-28 w-full' />
      ))}
    </div>
  );
}
