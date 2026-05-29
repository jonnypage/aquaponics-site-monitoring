import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import {
  defaultGoogleMapOptions,
  getGoogleMapsBrowserKey,
  GOOGLE_MAPS_LOADER_ID
} from "~/utils/google-maps";

export interface SiteLocationMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  title?: string;
}

function SiteLocationMapBody({
  apiKey,
  latitude,
  longitude
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
}) {
  const { t } = useTranslation();
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: apiKey
  });

  const center = { lat: latitude, lng: longitude };
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <>
      {loadError ? (
        <p className="text-sm text-destructive">{t("siteDetailPage.mapLoadError")}</p>
      ) : !isLoaded ? (
        <div
          role="status"
          className="flex h-[20.8rem] w-full flex-row items-center justify-center gap-2 rounded-md bg-muted text-sm text-muted-foreground"
        >
          <Spinner size="md" />
          <span>{t("siteDetailPage.mapLoading")}</span>
        </div>
      ) : (
        <div className="h-[30.8rem] w-full overflow-hidden rounded-md border border-border">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={center}
            zoom={15}
            options={defaultGoogleMapOptions}
          >
            <Marker position={center} />
          </GoogleMap>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t("siteDetailPage.mapCoords")} {latitude.toFixed(5)}, {longitude.toFixed(5)}{" "}
        <a className="text-primary underline" href={externalUrl} target="_blank" rel="noreferrer">
          {t("siteDetailPage.mapOpenExternal")}
        </a>
      </p>
    </>
  );
}

/**
 * Read-only site location (dashboard). Requires `VITE_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` for the interactive map.
 */
export function SiteLocationMap({ latitude, longitude, title }: SiteLocationMapProps) {
  const { t } = useTranslation();
  const apiKey = getGoogleMapsBrowserKey();
  const resolvedTitle = title ?? t("siteDetailPage.mapTitle");

  const latN = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
  const lngN = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;
  const hasPoint = latN != null && lngN != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          {resolvedTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasPoint ? (
          <p className="text-sm text-muted-foreground">{t("siteDetailPage.mapNoCoords")}</p>
        ) : !apiKey ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {t("siteDetailPage.mapSetApiKey")}
          </p>
        ) : (
          <SiteLocationMapBody apiKey={apiKey} latitude={latN} longitude={lngN} />
        )}
      </CardContent>
    </Card>
  );
}
