import { Link } from '@tanstack/react-router';
import { AlertTriangle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { Button } from '~/components/ui/button';
import { EntityKeyBadge } from '~/components/ui/entity-key-badge';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useAdminDevices, useAdminSites } from '~/hooks/useAdmin';
import { formatRelativeTime } from '~/utils/format';

export function AdminDevicesIndexPageContent() {
  const { t } = useTranslation();
  const { data: devices, isLoading, isError, error } = useAdminDevices();
  const { data: sites } = useAdminSites();
  const siteName = (id: string | null | undefined) =>
    id
      ? sites?.find((s) => s.id === id)?.name ?? id
      : t('admin.devices.unassigned');

  return (
    <>
      <PageHeader
        title={t('admin.devices.listTitle')}
        actions={
          <Button asChild>
            <Link to='/admin/devices/new'>
              <Plus className='mr-2 h-4 w-4' />
              {t('admin.devices.newTitle')}
            </Link>
          </Button>
        }
      />
      <PageBackLink to='/admin'>{t('admin.shared.backToAdmin')}</PageBackLink>
      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-14 w-full' />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className='flex items-center gap-3 py-6 text-sm text-destructive'>
            <AlertTriangle className='h-4 w-4 shrink-0' />
            {t('admin.shared.loadError', {
              message:
                error instanceof Error
                  ? error.message
                  : t('shared.unknownError'),
            })}
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-2'>
          {(devices ?? []).map((d) => (
            <Card key={d.deviceId}>
              <CardContent className='flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='text-sm font-medium'>
                    {d.name?.trim() ? (
                      d.name
                    ) : (
                      <EntityKeyBadge>{d.deviceId}</EntityKeyBadge>
                    )}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {siteName(d.siteId)} ·{' '}
                    {d.lastSeenAt
                      ? formatRelativeTime(new Date(d.lastSeenAt))
                      : '—'}
                  </p>
                </div>
                <Button variant='outline' size='sm' asChild>
                  <Link
                    to='/admin/devices/$deviceId/edit'
                    params={{ deviceId: d.deviceId }}
                  >
                    {t('admin.devices.editTitle')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
