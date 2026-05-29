import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/utils/cn';
import {
  defaultGoogleMapOptions,
  getGoogleMapsBrowserKey,
  GOOGLE_MAPS_LOADER_ID,
} from '~/utils/google-maps';

function parseDeg(s: string): number | null {
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : null;
}

/** Default map center for new sites and when lat/lng are unset (Belize). */
export const DEFAULT_SITE_MAP_CENTER: google.maps.LatLngLiteral = {
  lat: 18.070913,
  lng: -88.555175
};

function defaultCenter(): google.maps.LatLngLiteral {
  return DEFAULT_SITE_MAP_CENTER;
}

export interface SiteLocationMapPickerProps {
  className?: string;
  latitude: string;
  longitude: string;
  onPick: (lat: number, lng: number) => void;
}

function SiteLocationMapPickerInner({
  className,
  apiKey,
  latitude,
  longitude,
  onPick,
}: SiteLocationMapPickerProps & { apiKey: string }) {
  const { t } = useTranslation();
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey,
  });

  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral>(() => {
    const latN = parseDeg(latitude);
    const lngN = parseDeg(longitude);
    return latN != null && lngN != null
      ? { lat: latN, lng: lngN }
      : defaultCenter();
  });

  useEffect(() => {
    const latN = parseDeg(latitude);
    const lngN = parseDeg(longitude);
    if (latN != null && lngN != null) {
      setMarkerPos({ lat: latN, lng: lngN });
    }
  }, [latitude, longitude]);

  const hasPoint = parseDeg(latitude) != null && parseDeg(longitude) != null;
  const zoom = hasPoint ? 12 : 4;

  return (
    <div className={cn('space-y-3', className)}>
      <FormSectionHeading icon={MapPin}>{t('admin.sites.mapTitle')}</FormSectionHeading>
      <p className='text-xs text-muted-foreground'>
        {t('admin.sites.mapHint')}
      </p>
      {loadError ? (
        <p className='text-xs text-destructive'>
          {t('admin.sites.mapLoadError')}
        </p>
      ) : null}
      {!isLoaded ? (
        <div
          role='status'
          className='flex h-64 w-full flex-row items-center justify-center gap-2 rounded-md border bg-muted/30 text-sm text-muted-foreground'
        >
          <Spinner size='md' />
          <span>{t('siteDetailPage.mapLoading')}</span>
        </div>
      ) : (
        <div className='h-[30rem] w-full overflow-hidden rounded-md border bg-muted/30'>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={markerPos}
            zoom={zoom}
            options={defaultGoogleMapOptions}
            onClick={(e) => {
              const ll = e.latLng;
              if (!ll) {
                return;
              }
              const lat = ll.lat();
              const lng = ll.lng();
              setMarkerPos({ lat, lng });
              onPick(lat, lng);
            }}
          >
            <Marker
              position={markerPos}
              draggable
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (!ll) {
                  return;
                }
                const lat = ll.lat();
                const lng = ll.lng();
                setMarkerPos({ lat, lng });
                onPick(lat, lng);
              }}
            />
          </GoogleMap>
        </div>
      )}
    </div>
  );
}

/**
 * Optional map click / drag picker when `VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set (see product spec).
 */
export function SiteLocationMapPicker(props: SiteLocationMapPickerProps) {
  const trimmed = getGoogleMapsBrowserKey();
  if (!trimmed) {
    return null;
  }
  return <SiteLocationMapPickerInner {...props} apiKey={trimmed} />;
}
