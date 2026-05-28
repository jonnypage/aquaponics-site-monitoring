import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SiteLocationMapPicker } from '~/components/admin/site-location-map-picker';
import { SiteSensorThresholdOverrideRow } from '~/components/admin/site-sensor-threshold-override-row';

import { FormSectionHeading } from '~/components/layout/form-section-heading';
import { PageBackLink } from '~/components/layout/page-back-link';
import { PageHeader } from '~/components/layout/page-header';
import { Button } from '~/components/ui/button';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import {
  ButtonPendingLabel,
  LoadingIndicator,
} from '~/components/ui/loading-indicator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { EntityKeyBadge } from '~/components/ui/entity-key-badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  useAdminDevices,
  useAdminSites,
  useClearAdminSiteSnapshotsMutate,
  useDeleteAdminSiteMutate,
  useResetAdminSiteMeasurementsMutate,
  useSensorCatalog,
  useUpdateAdminSiteMutate,
} from '~/hooks/useAdmin';
import { sensorTypeLabelKey } from '~/utils/sensor-display-label';
import type { SensorType } from '~/utils/sensor-types';
import { siteSensorInstanceKey } from '~/utils/site-sensor-instance';

const routeApi = getRouteApi('/_authed/admin/sites/$siteId/edit');

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'default' | 'destructive';
  pendingLabel?: string;
  action: () => Promise<void>;
};

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
  const { data: siteDevices } = useAdminDevices(siteId);
  const { mutateAsync: updateSite, isPending } = useUpdateAdminSiteMutate();
  const { mutateAsync: resetMeasurements, isPending: isResettingMeasurements } =
    useResetAdminSiteMeasurementsMutate();
  const { mutateAsync: clearSnapshots, isPending: isClearingSnapshots } =
    useClearAdminSiteSnapshotsMutate();
  const { mutateAsync: deleteSite, isPending: isDeletingSite } =
    useDeleteAdminSiteMutate();
  const [dataActionMessage, setDataActionMessage] = useState<string | null>(
    null,
  );
  const [dataActionError, setDataActionError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

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

  const reportingByInstance = useMemo(() => {
    const map = new Map<
      string,
      {
        displayName: string;
        icon?: string | null;
        deviceName?: string | null;
      }
    >();
    for (const r of site?.sensorReporting ?? []) {
      map.set(siteSensorInstanceKey(r.deviceId, r.sensorKey), {
        displayName: r.displayName,
        icon: r.icon,
        deviceName: r.deviceName,
      });
    }
    return map;
  }, [site?.sensorReporting]);

  const reportingRows = useMemo(
    () => site?.sensorReporting ?? [],
    [site?.sensorReporting],
  );

  const reportingByDevice = useMemo(() => {
    const map = new Map<string, typeof reportingRows>();
    for (const row of reportingRows) {
      const list = map.get(row.deviceId) ?? [];
      list.push(row);
      map.set(row.deviceId, list);
    }
    return map;
  }, [reportingRows]);

  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [th, setTh] = useState<
    Record<string, { nm: string; nM: string; wd: string; cd: string }>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  function deviceLabel(deviceId: string, name?: string | null) {
    const trimmed = name?.trim();
    return trimmed ? `${trimmed} (${deviceId})` : deviceId;
  }

  function applyEnabledForDevice(deviceId: string) {
    const rows = reportingByDevice.get(deviceId) ?? [];
    setEnabled((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        next[siteSensorInstanceKey(deviceId, row.sensorKey)] = true;
      }
      return next;
    });
  }
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
      en[siteSensorInstanceKey(r.deviceId, r.sensorKey)] = r.enabled;
    }
    for (const r of site.sensorThresholds) {
      th0[siteSensorInstanceKey(r.deviceId, r.sensorKey)] = {
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
        sensorReporting: reportingRows.map((r) => ({
          deviceId: r.deviceId,
          sensorKey: r.sensorKey,
          enabled:
            enabled[siteSensorInstanceKey(r.deviceId, r.sensorKey)] ?? false,
        })),
        sensorThresholds: reportingRows.map((r) => {
          const key = siteSensorInstanceKey(r.deviceId, r.sensorKey);
          const row = th[key] ?? { nm: '', nM: '', wd: '', cd: '' };
          return {
            deviceId: r.deviceId,
            sensorKey: r.sensorKey,
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

  async function performResetMeasurements() {
    setDataActionError(null);
    setDataActionMessage(null);
    try {
      const result = await resetMeasurements(siteId);
      setDataActionMessage(
        t('admin.sites.resetMeasurementsSuccess', {
          count: result.deletedMeasurements,
          alerts: result.resolvedAlerts,
        }),
      );
    } catch (err) {
      setDataActionError(
        t('admin.sites.dataActionError', {
          message:
            err instanceof Error ? err.message : t('shared.unknownError'),
        }),
      );
    }
  }

  async function performClearSnapshots() {
    setDataActionError(null);
    setDataActionMessage(null);
    try {
      const result = await clearSnapshots(siteId);
      setDataActionMessage(
        result.storageSkipped
          ? t('admin.sites.clearSnapshotsSuccessStorageSkipped', {
              snapshots: result.deletedSnapshots,
            })
          : t('admin.sites.clearSnapshotsSuccess', {
              snapshots: result.deletedSnapshots,
              objects: result.deletedStorageObjects,
            }),
      );
    } catch (err) {
      setDataActionError(
        t('admin.sites.dataActionError', {
          message:
            err instanceof Error ? err.message : t('shared.unknownError'),
        }),
      );
    }
  }

  async function performDeleteSite() {
    setDeleteError(null);
    try {
      await deleteSite(siteId);
      await navigate({ to: '/admin/sites' });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : t('shared.unknownError'),
      );
    }
  }

  async function runPendingConfirm() {
    if (!pendingConfirm) {
      return;
    }
    setConfirmPending(true);
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } finally {
      setConfirmPending(false);
    }
  }

  function openResetMeasurementsConfirm() {
    setPendingConfirm({
      title: t('admin.sites.resetMeasurements'),
      description: t('admin.sites.resetMeasurementsConfirm'),
      confirmLabel: t('admin.sites.resetMeasurements'),
      confirmTone: 'default',
      action: performResetMeasurements,
    });
  }

  function openClearSnapshotsConfirm() {
    setPendingConfirm({
      title: t('admin.sites.clearSnapshots'),
      description: t('admin.sites.clearSnapshotsConfirm'),
      confirmLabel: t('admin.sites.clearSnapshots'),
      confirmTone: 'destructive',
      pendingLabel: t('admin.sites.clearSnapshots'),
      action: performClearSnapshots,
    });
  }

  function openDeleteSiteConfirm() {
    setPendingConfirm({
      title: t('admin.sites.deleteSiteTitle'),
      description: t('admin.sites.deleteSiteConfirm'),
      confirmLabel: t('admin.shared.delete'),
      confirmTone: 'destructive',
      pendingLabel: t('admin.shared.delete'),
      action: performDeleteSite,
    });
  }

  return (
    <>
      <PageHeader title={t('admin.sites.editTitle')} />
      <div className='mb-6 flex flex-wrap items-center gap-2'>
        <PageBackLink to='/admin/sites' className='mb-0'>
          {t('admin.sites.backToSites')}
        </PageBackLink>
        <Button variant='outline' size='sm' asChild>
          <Link to='/admin/sensors'>{t('admin.sensors.listTitle')}</Link>
        </Button>
        <Button variant='outline' size='sm' asChild>
          <Link to='/admin/devices'>{t('admin.devices.listTitle')}</Link>
        </Button>
      </div>
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
            <div className='space-y-4'>
              <FormSectionHeading>
                {t('admin.sites.sensorEnabled')}
              </FormSectionHeading>
              <p className='text-sm text-muted-foreground'>
                {t('admin.sites.deviceForSensorsHint')}
              </p>
              {!siteDevices?.length ? (
                <p className='text-sm text-muted-foreground'>
                  {t('admin.sites.deviceForSensorsNone')}{' '}
                  <Link to='/admin/devices' className='underline'>
                    {t('admin.devices.listTitle')}
                  </Link>
                </p>
              ) : reportingRows.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  {t('admin.sites.deviceForSensorsNoWired')}{' '}
                  <Link to='/admin/devices' className='underline'>
                    {t('admin.devices.listTitle')}
                  </Link>
                </p>
              ) : (
                [...reportingByDevice.entries()].map(([deviceId, rows]) => {
                  const deviceName =
                    rows[0]?.deviceName ??
                    siteDevices.find((d) => d.deviceId === deviceId)?.name;
                  return (
                    <div
                      key={deviceId}
                      className='min-w-0 space-y-3 rounded-md border border-border p-4'
                    >
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='text-sm font-medium'>
                          {deviceLabel(deviceId, deviceName)}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => applyEnabledForDevice(deviceId)}
                          >
                            {t('admin.sites.enableDeviceSensors')}
                          </Button>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {rows.map((r) => {
                          const instanceKey = siteSensorInstanceKey(
                            r.deviceId,
                            r.sensorKey,
                          );
                          return (
                            <label
                              key={instanceKey}
                              className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'
                            >
                              <input
                                type='checkbox'
                                checked={enabled[instanceKey] ?? false}
                                onChange={() =>
                                  setEnabled((p) => ({
                                    ...p,
                                    [instanceKey]: !(p[instanceKey] ?? false),
                                  }))
                                }
                              />
                              <span className='font-medium'>
                                {t(
                                  sensorTypeLabelKey(
                                    r.sensorType as SensorType,
                                  ),
                                )}
                                {r.model.trim() ? (
                                  <span className='font-normal text-muted-foreground'>
                                    {' '}
                                    ({r.model})
                                  </span>
                                ) : null}
                              </span>
                              <EntityKeyBadge>{r.sensorKey}</EntityKeyBadge>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className='space-y-3'>
              <FormSectionHeading>
                {t('admin.sites.thresholds')}
              </FormSectionHeading>
              <div className='space-y-4'>
                {reportingRows.map((r) => {
                  const instanceKey = siteSensorInstanceKey(
                    r.deviceId,
                    r.sensorKey,
                  );
                  const row = th[instanceKey] ?? {
                    nm: '',
                    nM: '',
                    wd: '',
                    cd: '',
                  };
                  const cat = catalogByKey.get(r.sensorKey);
                  const reporting = reportingByInstance.get(instanceKey);
                  const deviceName =
                    r.deviceName ??
                    siteDevices?.find((d) => d.deviceId === r.deviceId)?.name;
                  const sensorLabel = `${deviceLabel(
                    r.deviceId,
                    deviceName,
                  )} · ${
                    reporting?.displayName ?? cat?.displayName ?? r.sensorKey
                  }`;
                  return (
                    <SiteSensorThresholdOverrideRow
                      key={instanceKey}
                      rowId={instanceKey}
                      sensorKey={r.sensorKey}
                      sensorLabel={sensorLabel}
                      icon={reporting?.icon ?? cat?.icon}
                      catalogPhysicalMin={cat?.physicalMin}
                      catalogPhysicalMax={cat?.physicalMax}
                      row={row}
                      onChange={(next) =>
                        setTh((p) => ({ ...p, [instanceKey]: next }))
                      }
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
          <CardTitle className='text-base'>
            {t('admin.sites.dataManagementTitle')}
          </CardTitle>
          <CardDescription>
            {t('admin.sites.dataManagementDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
            <Button
              type='button'
              variant='outline'
              disabled={isResettingMeasurements || isClearingSnapshots}
              onClick={openResetMeasurementsConfirm}
            >
              <ButtonPendingLabel pending={isResettingMeasurements}>
                {t('admin.sites.resetMeasurements')}
              </ButtonPendingLabel>
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={isResettingMeasurements || isClearingSnapshots}
              onClick={openClearSnapshotsConfirm}
            >
              <ButtonPendingLabel pending={isClearingSnapshots}>
                {t('admin.sites.clearSnapshots')}
              </ButtonPendingLabel>
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={
                isDeletingSite || isResettingMeasurements || isClearingSnapshots
              }
              onClick={openDeleteSiteConfirm}
            >
              <ButtonPendingLabel pending={isDeletingSite}>
                {t('admin.shared.delete') + ' ' + t('admin.devices.site')}
              </ButtonPendingLabel>
            </Button>
          </div>
          {dataActionMessage ? (
            <p className='text-sm text-muted-foreground'>{dataActionMessage}</p>
          ) : null}
          {dataActionError ? (
            <p className='text-sm text-destructive'>{dataActionError}</p>
          ) : null}
          {deleteError ? (
            <p className='text-sm text-destructive'>{deleteError}</p>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirm(null);
          }
        }}
        title={pendingConfirm?.title ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel}
        confirmTone={pendingConfirm?.confirmTone}
        pending={confirmPending}
        pendingLabel={pendingConfirm?.pendingLabel}
        onConfirm={() => void runPendingConfirm()}
      >
        {pendingConfirm?.description}
      </ConfirmDialog>
    </>
  );
}
