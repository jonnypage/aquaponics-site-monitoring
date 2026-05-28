import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '~/components/ui/badge';
import { EntityKeyBadge } from '~/components/ui/entity-key-badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { ButtonPendingLabel } from '~/components/ui/loading-indicator';
import {
  AlertSeverity,
  AlertStatus,
  type GetAlertsQuery,
} from '~/gql/generated/graphql';
import { useResolveAlertMutate, type ResolveAlertInput } from '~/hooks/useAPI';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { formatAlertDisplay } from '~/utils/alert-display';
import { formatRelativeTime } from '~/utils/format';

export type AlertRow = GetAlertsQuery['getAlerts'][number];

interface AlertCardProps {
  alert: AlertRow;
  siteName?: string;
}

export function AlertCard({ alert, siteName }: AlertCardProps) {
  const { t } = useTranslation();
  useRelativeTimeTick();
  const {
    mutateAsync: resolveAlert,
    isPending: isResolving,
    variables: resolvingAlertId
  } = useResolveAlertMutate();

  const display = formatAlertDisplay(alert, [], t);

  return (
    <Card>
      <CardContent className='flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant={
                alert.severity === AlertSeverity.Critical
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {alert.severity === AlertSeverity.Critical
                ? t('alertsPage.severity.critical')
                : t('alertsPage.severity.warning')}
            </Badge>
            <Badge variant='outline'>
              {alert.status === AlertStatus.Active
                ? t('alertsPage.status.active')
                : t('alertsPage.status.resolved')}
            </Badge>
            {display.deviceLabel ? (
              <Badge variant='outline'>{display.deviceLabel}</Badge>
            ) : null}
            <EntityKeyBadge className='text-muted-foreground'>
              {alert.type}
            </EntityKeyBadge>
          </div>
          <p className='text-sm leading-relaxed text-foreground'>
            {display.message}
          </p>
          <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
            <span>
              {t('alertsPage.site')}:{' '}
              {siteName ? (
                <Link
                  to='/sites/$siteId'
                  params={{ siteId: alert.siteId }}
                  className='text-primary underline-offset-4 hover:underline'
                >
                  {siteName}
                </Link>
              ) : (
                <Link
                  to='/sites/$siteId'
                  params={{ siteId: alert.siteId }}
                  className='inline-flex underline-offset-4 hover:underline'
                >
                  <EntityKeyBadge>{alert.siteId}</EntityKeyBadge>
                </Link>
              )}
            </span>
            <span>
              {t('alertsPage.updated')}:{' '}
              {formatRelativeTime(new Date(alert.updatedAt))}
            </span>
          </div>
        </div>
        {alert.status === AlertStatus.Active ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='shrink-0 self-start'
            disabled={isResolving}
            onClick={() =>
              void resolveAlert({ id: alert.id, siteId: alert.siteId } satisfies ResolveAlertInput)
            }
          >
            <ButtonPendingLabel pending={isResolving && resolvingAlertId?.id === alert.id}>
              {t('alertsPage.resolve')}
            </ButtonPendingLabel>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
