import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { formatRelativeTime } from '~/utils/format';

export interface SiteLatestSnapshotProps {
  imageUrl: string;
  takenAt: string | Date;
  deviceId: string;
}

export function SiteLatestSnapshot({ imageUrl, takenAt, deviceId }: SiteLatestSnapshotProps) {
  const { t } = useTranslation();
  const taken = new Date(takenAt);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base font-medium">{t('siteDetailPage.latestSnapshot')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <img
          src={imageUrl}
          alt={t('siteDetailPage.snapshotAlt')}
          className="max-h-80 w-full rounded-md border object-contain bg-muted/30"
        />
        <p className="text-xs text-muted-foreground">
          {t('siteDetailPage.snapshotMeta', {
            time: formatRelativeTime(taken),
            deviceId,
          })}
        </p>
      </CardContent>
    </Card>
  );
}
