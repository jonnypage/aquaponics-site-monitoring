import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useRelativeTimeTick } from '~/hooks/useRelativeTimeTick';
import { cn } from '~/utils/cn';
import { formatRelativeTime } from '~/utils/format';

export interface SiteSnapshotCarouselItem {
  id: string;
  imageUrl: string;
  takenAt: string | Date;
  deviceId: string;
  deviceName?: string | null;
}

export interface SiteLatestSnapshotProps {
  snapshots: readonly SiteSnapshotCarouselItem[];
}

function snapshotDeviceLabel(
  deviceId: string,
  deviceName?: string | null,
): string {
  const trimmed = deviceName?.trim();
  return trimmed ? trimmed : deviceId;
}

function activeIndexFromScroll(container: HTMLDivElement): number {
  const { scrollLeft, clientWidth } = container;
  if (clientWidth <= 0) {
    return 0;
  }
  const center = scrollLeft + clientWidth / 2;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i] as HTMLElement;
    const childCenter = child.offsetLeft + child.offsetWidth / 2;
    const dist = Math.abs(childCenter - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function SiteLatestSnapshot({ snapshots }: SiteLatestSnapshotProps) {
  const { t } = useTranslation();
  useRelativeTimeTick();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = snapshots.length > 1;

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, snapshots.length - 1));
      setActiveIndex(clamped);
      const container = scrollRef.current;
      const slide = container?.children[clamped] as HTMLElement | undefined;
      slide?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    },
    [snapshots.length],
  );

  useEffect(() => {
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ left: 0 });
  }, [snapshots.map((s) => s.id).join('|')]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    setActiveIndex(activeIndexFromScroll(container));
  }, []);

  if (snapshots.length === 0) {
    return null;
  }

  const current = snapshots[activeIndex] ?? snapshots[0]!;
  const taken = new Date(current.takenAt);

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Camera
            className='h-5 w-5 shrink-0 text-muted-foreground'
            aria-hidden
          />
          {t('siteDetailPage.latestSnapshot')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div
          className='relative'
          role='region'
          aria-roledescription='carousel'
          aria-label={t('siteDetailPage.snapshotCarouselLabel')}
        >
          {hasMultiple ? (
            <>
              <Button
                type='button'
                variant='secondary'
                size='icon'
                className='absolute top-1/2 left-1 z-10 h-9 w-9 -translate-y-1/2 shadow-sm sm:left-2'
                disabled={activeIndex <= 0}
                aria-label={t('siteDetailPage.snapshotPrevious')}
                onClick={() => goTo(activeIndex - 1)}
              >
                <ChevronLeft className='h-5 w-5' aria-hidden />
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='icon'
                className='absolute top-1/2 right-1 z-10 h-9 w-9 -translate-y-1/2 shadow-sm sm:right-2'
                disabled={activeIndex >= snapshots.length - 1}
                aria-label={t('siteDetailPage.snapshotNext')}
                onClick={() => goTo(activeIndex + 1)}
              >
                <ChevronRight className='h-5 w-5' aria-hidden />
              </Button>
            </>
          ) : null}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn(
              'flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth',
              '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              hasMultiple && 'touch-pan-x px-10 sm:px-12',
            )}
          >
            {snapshots.map((snap, index) => (
              <div
                key={snap.id}
                className='w-full shrink-0 snap-center snap-always'
                aria-hidden={index !== activeIndex}
              >
                <a
                  href={snap.imageUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='block'
                  tabIndex={index === activeIndex ? 0 : -1}
                >
                  <img
                    src={snap.imageUrl}
                    alt={t('siteDetailPage.snapshotAlt')}
                    className='max-h-90 w-full rounded-md border object-contain bg-muted/30'
                    loading={index === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                </a>
              </div>
            ))}
          </div>

          {hasMultiple ? (
            <div
              className='mt-2 flex items-center justify-center gap-1.5'
              role='tablist'
              aria-label={t('siteDetailPage.snapshotDotsLabel')}
            >
              {snapshots.map((snap, index) => (
                <button
                  key={snap.id}
                  type='button'
                  role='tab'
                  aria-selected={index === activeIndex}
                  aria-label={t('siteDetailPage.snapshotGoTo', {
                    index: index + 1,
                    total: snapshots.length,
                  })}
                  className={cn(
                    'h-2 min-w-2 rounded-full transition-colors',
                    index === activeIndex
                      ? 'w-5 bg-primary'
                      : 'w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55',
                  )}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className='flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5'>
          <p className='text-xs text-muted-foreground'>
            {t('siteDetailPage.snapshotCaptured', {
              time: formatRelativeTime(taken),
              device: snapshotDeviceLabel(current.deviceId, current.deviceName),
            })}
          </p>
          {hasMultiple ? (
            <p className='text-xs text-muted-foreground tabular-nums'>
              {t('siteDetailPage.snapshotCounter', {
                current: activeIndex + 1,
                total: snapshots.length,
              })}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
