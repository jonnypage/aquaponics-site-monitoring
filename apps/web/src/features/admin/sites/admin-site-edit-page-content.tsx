import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SiteLocationMapPicker } from '~/components/admin/site-location-map-picker';
import { SiteSensorThresholdOverrideRow } from '~/components/admin/site-sensor-threshold-override-row';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { Button } from '~/components/ui/button';
import {
  ButtonPendingLabel,
  LoadingIndicator,
} from '~/components/ui/loading-indicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { EntityKeyBadge } from '~/components/ui/entity-key-badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  useAdminSites,
  useClearAdminSiteSnapshotsMutate,
  useResetAdminSiteMeasurementsMutate,
  useSensorCatalog,
  useUpdateAdminSiteMutate,
} from '~/hooks/useAdmin';

const routeApi = getRouteApi('/_authed/admin/sites/$siteId/edit');

function parseOptFloat(s: string): number | null {
  const t = s.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function AdminSiteEditPageContent() {
  const { siteId } = routeApi.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sites, isLoading } = useAdminSites();
  const { data: catalog } = useSensorCatalog();
  const { mutateAsync: updateSite, isPending } = useUpdateAdminSiteMutate();
  const {
    mutateAsync: resetMeasurements,
    isPending: isResettingMeasurements
  } = useResetAdminSiteMeasurementsMutate();
  const {
    mutateAsync: clearSnapshots,
    isPending: isClearingSnapshots
  } = useClearAdminSiteSnapshotsMutate();
  const [dataActionMessage, setDataActionMessage] = useState<string | null>(null);
  const [dataActionError, setDataActionError] = useState<string | null>(null);

  const site = useMemo(
    () => sites?.find((s) => s.id === siteId),
    [sites, siteId],
  );

  const catalogByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        physicalMin?: number | null;
        physicalMax?: number | null;
        displayName: string;
        icon?: string | null;
      }
    >();
    for (const c of catalog ?? []) {
      map.set(c.key, {
        physicalMin: c.physicalMin,
        physicalMax: c.physicalMax,
        displayName: c.displayName,
        icon: c.icon,
      });
    }
    return map;
  }, [catalog]);

  const reportingByKey = useMemo(() => {
    const map = new Map<
      string,
      { displayName: string; icon?: string | null }
    >();
    for (const r of site?.sensorReporting ?? []) {
      map.set(r.sensorKey, { displayName: r.displayName, icon: r.icon });
    }
    return map;
  }, [site?.sensorReporting]);
  const keys = useMemo(
    () => site?.sensorReporting.map((r) => r.sensorKey) ?? [],
    [site],
  );

  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [th, setTh] = useState<
    Record<string, { nm: string; nM: string; wd: string; cd: string }>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const onMapPick = useCallback((la: number, ln: number) => {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
  }, []);

  useEffect(() => {
    if (!site) {
      return;
    }
    setName(site.name);
    setLat(site.latitude != null ? String(site.latitude) : '');
    setLng(site.longitude != null ? String(site.longitude) : '');
    const en: Record<string, boolean> = {};
    const th0: Record<
      string,
      { nm: string; nM: string; wd: string; cd: string }
    > = {};
    for (const r of site.sensorReporting) {
      en[r.sensorKey] = r.enabled;
    }
    for (const r of site.sensorThresholds) {
      th0[r.sensorKey] = {
        nm: r.normalMin != null ? String(r.normalMin) : '',
        nM: r.normalMax != null ? String(r.normalMax) : '',
        wd: r.warningDelta != null ? String(r.warningDelta) : '',
        cd: r.criticalDelta != null ? String(r.criticalDelta) : '',
      };
    }
    setEnabled(en);
    setTh(th0);
  }, [site]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!site) {
      return;
    }
    setFormError(null);
    const latN = parseOptFloat(lat);
    const lngN = parseOptFloat(lng);
    if ((lat.trim() && !lng.trim()) || (!lat.trim() && lng.trim())) {
      setFormError('Set both latitude and longitude, or leave both empty.');
      return;
    }
    try {
      await updateSite({
        id: site.id,
        name,
        latitude: latN,
        longitude: lngN,
        sensorReporting: keys.map((k) => ({
          sensorKey: k,
          enabled: enabled[k] ?? false,
        })),
        sensorThresholds: keys.map((k) => {
          const row = th[k] ?? { nm: '', nM: '', wd: '', cd: '' };
          return {
            sensorKey: k,
            normalMin: parseOptFloat(row.nm),
            normalMax: parseOptFloat(row.nM),
            warningDelta: parseOptFloat(row.wd),
            criticalDelta: parseOptFloat(row.cd),
          };
        }),
      });
      await navigate({ to: '/admin/sites' });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t('shared.unknownError'),
      );
    }
  }

  if (isLoading || !sites) {
    return <LoadingIndicator className='py-12' />;
  }
  if (!site) {
    return (
      <p className='text-sm text-destructive'>
        {t('siteDetailPage.notFound')}{' '}
        <Link to='/admin/sites' className='underline'>
          {t('admin.sites.backToSites')}
        </Link>
      </p>
    );
  }

  async function onResetMeasurements() {
    if (!window.confirm(t('admin.sites.resetMeasurementsConfirm'))) {
      return;
    }
    setDataActionError(null);
    setDataActionMessage(null);
    try {
      const result = await resetMeasurements(siteId);
      setDataActionMessage(
        t('admin.sites.resetMeasurementsSuccess', {
          count: result.deletedMeasurements,
          alerts: result.resolvedAlerts
        })
      );
    } catch (err) {
      setDataActionError(
        t('admin.sites.dataActionError', {
          message: err instanceof Error ? err.message : t('shared.unknownError')
        })
      );
    }
  }

  async function onClearSnapshots() {
    if (!window.confirm(t('admin.sites.clearSnapshotsConfirm'))) {
      return;
    }
    setDataActionError(null);
    setDataActionMessage(null);
    try {
      const result = await clearSnapshots(siteId);
      setDataActionMessage(
        result.storageSkipped
          ? t('admin.sites.clearSnapshotsSuccessStorageSkipped', {
              snapshots: result.deletedSnapshots
            })
          : t('admin.sites.clearSnapshotsSuccess', {
              snapshots: result.deletedSnapshots,
              objects: result.deletedStorageObjects
            })
      );
    } catch (err) {
      setDataActionError(
        t('admin.sites.dataActionError', {
          message: err instanceof Error ? err.message : t('shared.unknownError')
        })
      );
    }
  }

  return (
    <>
      <PageHeader title={t('admin.sites.editTitle')} />
      <PageBackLink to='/admin/sites'>
        {t('admin.sites.backToSites')}
      </PageBackLink>
      {/* <div className='mb-6'>
        <SiteAlertsSection
          siteId={site.id}
          sensorReporting={site.sensorReporting}
        />
      </div> */}
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
            <div className='space-y-3'>
              <FormSectionHeading>{t('admin.sites.sensorEnabled')}</FormSectionHeading>
              {keys.map((k) => (
                <label key={k} className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={enabled[k] ?? true}
                    onChange={() =>
                      setEnabled((p) => ({ ...p, [k]: !(p[k] ?? true) }))
                    }
                  />
                  <EntityKeyBadge>{k}</EntityKeyBadge>
                </label>
              ))}
            </div>
            <div className='space-y-3'>
              <FormSectionHeading>{t('admin.sites.thresholds')}</FormSectionHeading>
              <div className='space-y-4'>
                {keys.map((k) => {
                  const row = th[k] ?? { nm: '', nM: '', wd: '', cd: '' };
                  const cat = catalogByKey.get(k);
                  const reporting = reportingByKey.get(k);
                  return (
                    <SiteSensorThresholdOverrideRow
                      key={k}
                      sensorKey={k}
                      sensorLabel={reporting?.displayName ?? cat?.displayName}
                      icon={reporting?.icon ?? cat?.icon}
                      catalogPhysicalMin={cat?.physicalMin}
                      catalogPhysicalMax={cat?.physicalMax}
                      row={row}
                      onChange={(next) => setTh((p) => ({ ...p, [k]: next }))}
                    />
                  );
                })}
              </div>
            </div>

            {formError ? (
              <p className='text-sm text-destructive'>{formError}</p>
            ) : null}
            <Button type='submit' disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>
                {t('admin.shared.save')}
              </ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className='mt-6 border-destructive/30'>
        <CardHeader>
          <CardTitle className='text-base'>{t('admin.sites.dataManagementTitle')}</CardTitle>
          <CardDescription>{t('admin.sites.dataManagementDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
            <Button
              type='button'
              variant='outline'
              disabled={isResettingMeasurements || isClearingSnapshots}
              onClick={() => void onResetMeasurements()}
            >
              <ButtonPendingLabel pending={isResettingMeasurements}>
                {t('admin.sites.resetMeasurements')}
              </ButtonPendingLabel>
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={isResettingMeasurements || isClearingSnapshots}
              onClick={() => void onClearSnapshots()}
            >
              <ButtonPendingLabel pending={isClearingSnapshots}>
                {t('admin.sites.clearSnapshots')}
              </ButtonPendingLabel>
            </Button>
          </div>
          {dataActionMessage ? (
            <p className='text-sm text-muted-foreground'>{dataActionMessage}</p>
          ) : null}
          {dataActionError ? (
            <p className='text-sm text-destructive'>{dataActionError}</p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
