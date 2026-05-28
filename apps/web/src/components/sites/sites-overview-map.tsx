import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  GoogleMap,
  Marker,
  OVERLAY_MOUSE_TARGET,
  OverlayView,
  useJsApiLoader,
} from '@react-google-maps/api';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SectionFrame } from '~/components/layout/section-frame';
import { Skeleton } from '~/components/ui/skeleton';
import { SiteStatus } from '~/gql/generated/graphql';
import {
  defaultGoogleMapOptions,
  getGoogleMapsBrowserKey,
  GOOGLE_MAPS_LOADER_ID,
} from '~/utils/google-maps';
import { cn } from '~/utils/cn';
import { siteStatusMapPinLabelClassName } from '~/utils/site-status-theme';

const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 39.8283,
  lng: -98.5795,
};

export type SiteForOverviewMap = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: SiteStatus | null;
};

type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: SiteStatus;
};

function toPins(sites: SiteForOverviewMap[]): MapPin[] {
  return sites
    .map((s) => {
      if (s.latitude == null || s.longitude == null) {
        return null;
      }
      const lat =
        typeof s.latitude === 'number' ? s.latitude : Number(s.latitude);
      const lng =
        typeof s.longitude === 'number' ? s.longitude : Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
      }
      return {
        id: s.id,
        name: s.name,
        lat,
        lng,
        status: s.status ?? SiteStatus.Unknown,
      };
    })
    .filter((p): p is MapPin => p != null);
}

/** After layout/tiles so fitBounds uses a real map size (avoids full-continent zoom). */
function fitMapToPinsWhenIdle(map: google.maps.Map, pinList: MapPin[]) {
  if (pinList.length === 0) {
    return;
  }

  const apply = () => {
    if (pinList.length === 1) {
      map.setCenter({ lat: pinList[0].lat, lng: pinList[0].lng });
      map.setZoom(12);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of pinList) {
      bounds.extend({ lat: p.lat, lng: p.lng });
    }
    map.fitBounds(bounds, { top: 72, right: 56, bottom: 56, left: 56 });
  };

  google.maps.event.addListenerOnce(map, 'idle', apply);
}

export interface SitesOverviewMapProps {
  sites: SiteForOverviewMap[];
  className?: string;
}

export function SitesOverviewMapSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <SectionFrame className={className}>
      <Skeleton className='aspect-[4/3] min-h-[400px] w-full rounded-md' />
      <Skeleton className='h-4 w-64 max-w-full' />
    </SectionFrame>
  );
}

function SitesOverviewMapLoaded({
  sites,
  className,
  apiKey,
}: SitesOverviewMapProps & { apiKey: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinsRef = useRef<MapPin[]>([]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey,
  });

  const pins = useMemo(() => toPins(sites), [sites]);
  const withoutCoords = sites.length - pins.length;

  pinsRef.current = pins;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitMapToPinsWhenIdle(map, pinsRef.current);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || pins.length === 0) {
      return;
    }
    fitMapToPinsWhenIdle(map, pins);
  }, [isLoaded, pins]);

  const openSite = useCallback(
    (siteId: string) => {
      void navigate({ to: '/sites/$siteId', params: { siteId } });
    },
    [navigate],
  );

  if (pins.length === 0) {
    return (
      <SectionFrame className={className}>
        <p className='rounded-md border border-border bg-muted/80 p-4 text-sm text-muted-foreground'>
          {t('sitesPage.mapNoCoords')}
        </p>
      </SectionFrame>
    );
  }

  if (loadError) {
    return (
      <SectionFrame className={className}>
        <p className='text-sm text-destructive'>
          {t('sitesPage.mapLoadError')}
        </p>
      </SectionFrame>
    );
  }

  if (!isLoaded) {
    return (
      <SectionFrame className={className}>
        <Skeleton className='aspect-[4/3] min-h-[400px] w-full rounded-md' />
        <Skeleton className='h-4 w-64 max-w-full' />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame className={className}>
      <div className='relative aspect-[4/3] min-h-[400px] max-h-[600px] w-full overflow-hidden rounded-md border border-border'>
        <GoogleMap
          mapContainerStyle={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
          }}
          center={DEFAULT_CENTER}
          zoom={4}
          options={defaultGoogleMapOptions}
          onLoad={onMapLoad}
          clickableIcons={false}
        >
          {pins.map((p) => (
            <Fragment key={p.id}>
              <OverlayView
                position={{ lat: p.lat, lng: p.lng }}
                mapPaneName={OVERLAY_MOUSE_TARGET}
              >
                <div
                  className='pointer-events-none'
                  style={{
                    width: 'min(10rem, calc(100vw - 3rem))',
                    transform: 'translate(-50%, calc(-100% - 2.75rem))',
                  }}
                >
                  <button
                    type='button'
                    className={cn(
                      'pointer-events-auto w-full rounded-md border px-2 py-1 text-center text-xs font-medium leading-snug shadow-md hover:brightness-[0.97] dark:hover:brightness-110',
                      siteStatusMapPinLabelClassName(p.status),
                    )}
                    onClick={() => openSite(p.id)}
                  >
                    {p.name}
                  </button>
                </div>
              </OverlayView>
              <Marker
                position={{ lat: p.lat, lng: p.lng }}
                title={p.name}
                onClick={() => openSite(p.id)}
              />
            </Fragment>
          ))}
        </GoogleMap>
      </div>
      <p className='text-xs text-muted-foreground'>
        {t('sitesPage.mapHint')}
        {withoutCoords > 0
          ? ` ${t('sitesPage.mapHiddenWithoutCoords', {
              count: withoutCoords,
            })}`
          : null}
      </p>
    </SectionFrame>
  );
}

export function SitesOverviewMap({ sites, className }: SitesOverviewMapProps) {
  const { t } = useTranslation();
  const apiKey = getGoogleMapsBrowserKey();

  if (!apiKey) {
    return (
      <SectionFrame className={className}>
        <p className='rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground'>
          {t('sitesPage.mapSetApiKey')}
        </p>
      </SectionFrame>
    );
  }

  return (
    <SitesOverviewMapLoaded
      sites={sites}
      className={className}
      apiKey={apiKey}
    />
  );
}
