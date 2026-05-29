import { Link } from '@tanstack/react-router';
import { AlertTriangle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SensorIcon } from '~/components/sensor-icon';
import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { Button } from '~/components/ui/button';
import { EntityKeyBadge } from '~/components/ui/entity-key-badge';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useAdminDevices, useAdminSites } from '~/hooks/useAdmin';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { formatRelativeTime } from '~/utils/format';
import { formatMeasurementReading } from '~/utils/measurement-reading';

export function AdminDevicesIndexPageContent() {
  const { t } = useTranslation();
  useRelativeTimeTick();
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
                  {d.sensorReadings.length > 0 ? (
                    <p className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                      {d.sensorReadings.map((reading) => (
                        <span
                          key={reading.sensorKey}
                          className='inline-flex items-center gap-1 text-muted-foreground'
                        >
                          <SensorIcon
                            name={reading.icon ?? undefined}
                            className='h-3.5 w-3.5 shrink-0'
                          />
                          <span className='text-foreground'>
                            {reading.displayName}
                          </span>
                          <span>
                            {reading.value != null
                              ? formatMeasurementReading(
                                  reading.value,
                                  reading.unit,
                                )
                              : '—'}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {t('admin.devices.sensorReadingsNoSensors')}
                    </p>
                  )}
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
