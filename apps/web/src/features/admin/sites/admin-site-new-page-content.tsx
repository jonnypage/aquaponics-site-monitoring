import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_SITE_MAP_CENTER,
  SiteLocationMapPicker,
} from '~/components/admin/site-location-map-picker';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { Button } from '~/components/ui/button';
import {
  ButtonPendingLabel,
  LoadingIndicator,
} from '~/components/ui/loading-indicator';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useCreateAdminSiteMutate } from '~/hooks/useAdmin';

function parseOptFloat(s: string): number | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function AdminSiteNewPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: createSite, isPending } = useCreateAdminSiteMutate();

  const [name, setName] = useState('');
  const [lat, setLat] = useState(String(DEFAULT_SITE_MAP_CENTER.lat));
  const [lng, setLng] = useState(String(DEFAULT_SITE_MAP_CENTER.lng));
  const [formError, setFormError] = useState<string | null>(null);

  const onMapPick = useCallback((la: number, ln: number) => {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const latN = parseOptFloat(lat);
    const lngN = parseOptFloat(lng);
    if ((lat.trim() && !lng.trim()) || (!lat.trim() && lng.trim())) {
      setFormError('Set both latitude and longitude, or leave both empty.');
      return;
    }
    try {
      await createSite({
        name,
        latitude: latN,
        longitude: lngN,
      });
      await navigate({ to: '/admin/sites' });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t('shared.unknownError'),
      );
    }
  }

  return (
    <>
      <PageHeader title={t('admin.sites.newTitle')} />
      <PageBackLink to='/admin/sites'>{t('admin.hub.sitesTitle')}</PageBackLink>
      <Card className='w-full'>
        <CardContent className='pt-6'>
          <form className='space-y-6' onSubmit={(e) => void onSubmit(e)}>
            <div className='space-y-3'>
              <FormSectionHeading id='site-name-heading'>
                {t('admin.sites.name')}
              </FormSectionHeading>
              <Input
                id='sname'
                aria-labelledby='site-name-heading'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <SiteLocationMapPicker
              latitude={lat}
              longitude={lng}
              onPick={onMapPick}
            />
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='lat'>{t('admin.sites.latitude')}</Label>
                <Input
                  id='lat'
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='lng'>{t('admin.sites.longitude')}</Label>
                <Input
                  id='lng'
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
            <p className='text-sm text-muted-foreground'>
              {t('admin.sites.newSiteSensorsHint')}{' '}
              <Link to='/admin/devices' className='underline'>
                {t('admin.devices.listTitle')}
              </Link>
            </p>
            {formError ? (
              <p className='text-sm text-destructive'>{formError}</p>
            ) : null}
            <Button type='submit' disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>
                {t('admin.shared.create')}
              </ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
