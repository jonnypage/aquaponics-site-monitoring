import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '~/components/layout/page-header';
import { SectionFrame } from '~/components/layout/section-frame';
import { SiteCard } from '~/components/sites/site-card';
import {
  SitesOverviewMap,
  SitesOverviewMapSkeleton,
} from '~/components/sites/sites-overview-map';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useSites } from '~/hooks/useAPI';

export function SitesIndexPageContent() {
  const { t } = useTranslation();
  const { data: sites, isLoading, isError, error } = useSites();

  return (
    <>
      <PageHeader
        title={t('sitesPage.title')}
        description={t('sitesPage.description')}
      />
      {isLoading ? (
        <>
          <SectionFrame>
            <SitesGridSkeleton />
          </SectionFrame>
          <SitesMapSection>
            <SitesOverviewMapSkeleton />
          </SitesMapSection>
        </>
      ) : isError ? (
        <Card>
          <CardContent className='flex items-center gap-3 py-6 text-sm text-destructive'>
            <AlertTriangle className='h-4 w-4' />
            {t('sitesPage.loadError', {
              message:
                error instanceof Error
                  ? error.message
                  : t('shared.unknownError'),
            })}
          </CardContent>
        </Card>
      ) : !sites?.length ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            {t('sitesPage.empty')}
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionFrame>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
          </SectionFrame>
          <SitesMapSection>
            <SitesOverviewMap sites={sites} />
          </SitesMapSection>
        </>
      )}
    </>
  );
}

function SitesMapSection({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className='mt-6'>
      <PageHeader
        title={t('sitesPage.mapTitle')}
        description={t('sitesPage.mapDescription')}
      />
      {children}
    </section>
  );
}

function SitesGridSkeleton() {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className='h-32 w-full' />
      ))}
    </div>
  );
}
