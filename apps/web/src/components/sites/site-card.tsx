import { Link } from '@tanstack/react-router';
import { ChevronRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { SiteStatusBadge } from '~/components/sites/site-status-badge';
import type { SiteStatus } from '~/gql/generated/graphql';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { formatRelativeTime } from '~/utils/format';
import { siteStatusCardClassName } from '~/utils/site-status-theme';
import { cn } from '~/utils/cn';

interface SiteCardProps {
  id: string;
  name: string;
  status: SiteStatus;
  lastUpdate: Date | string | null | undefined;
}

export function SiteCard({ id, name, status, lastUpdate }: SiteCardProps) {
  const { t } = useTranslation();
  useRelativeTimeTick();
  const lastSeen = lastUpdate
    ? formatRelativeTime(new Date(lastUpdate))
    : t('siteCard.noReadingsYet');

  return (
    <Link to='/sites/$siteId' params={{ siteId: id }} className='group block'>
      <Card className={cn(siteStatusCardClassName(status))}>
        <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-3'>
          <div className='space-y-1'>
            <CardTitle className='text-lg group-hover:text-primary'>
              {name}
            </CardTitle>
            <CardDescription className='text-xs'>
              {
                // t("siteCard.idLabel", { id })
              }
            </CardDescription>
          </div>
          <SiteStatusBadge status={status} />
        </CardHeader>
        <CardContent className='flex items-center justify-between pt-0 text-sm text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <Clock className='h-3.5 w-3.5' />
            {lastSeen}
          </span>
          <ChevronRight className='h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
        </CardContent>
      </Card>
    </Link>
  );
}
