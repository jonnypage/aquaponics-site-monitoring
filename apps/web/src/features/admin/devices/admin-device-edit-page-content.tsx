import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel, LoadingIndicator } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { AdminDeviceRecentSnapshots } from "~/components/admin/admin-device-recent-snapshots";
import { EntityKeyBadge } from "~/components/ui/entity-key-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAdminDevice, useAdminSites, useDeleteAdminDeviceMutate, useUpdateAdminDeviceMutate } from "~/hooks/useAdmin";

const routeApi = getRouteApi("/_authed/admin/devices/$deviceId/edit");

function parseOptInt(s: string, fallback: number): number {
  const t = s.trim();
  if (!t) {
    return fallback;
  }
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function AdminDeviceEditPageContent() {
  const { deviceId } = routeApi.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: device, isLoading, isError, error } = useAdminDevice(deviceId);
  const { data: sites } = useAdminSites();
  const { mutateAsync: updateDevice, isPending: isSaving } = useUpdateAdminDeviceMutate();
  const { mutateAsync: deleteDevice, isPending: isDeleting } = useDeleteAdminDeviceMutate();

  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [expected, setExpected] = useState("");
  const [report, setReport] = useState("");
  const [snapshot, setSnapshot] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!device) {
      return;
    }
    setName(device.name ?? "");
    setSiteId(device.siteId ?? "");
    setExpected(String(device.expectedIntervalSeconds));
    setReport(String(device.reportIntervalSeconds));
    setSnapshot(String(device.snapshotIntervalSeconds));
    setHasCamera(device.hasCamera);
  }, [device]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!device) {
      return;
    }
    setFormError(null);
    try {
      await updateDevice({
        deviceId: device.deviceId,
        name: name.trim() ? name.trim() : null,
        siteId: siteId === "" ? null : siteId,
        expectedIntervalSeconds: parseOptInt(expected, device.expectedIntervalSeconds),
        reportIntervalSeconds: parseOptInt(report, device.reportIntervalSeconds),
        snapshotIntervalSeconds: parseOptInt(snapshot, device.snapshotIntervalSeconds),
        hasCamera
      });
      await navigate({ to: "/admin/devices" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  async function onDelete() {
    if (!window.confirm(t("admin.devices.deleteConfirm"))) {
      return;
    }
    try {
      await deleteDevice(deviceId);
      await navigate({ to: "/admin/devices" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {t("admin.shared.loadError", {
            message: error instanceof Error ? error.message : t("shared.unknownError")
          })}
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !device) {
    return <LoadingIndicator className="py-12" />;
  }

  return (
    <>
      <PageHeader title={t("admin.devices.editTitle")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PageBackLink to="/admin/devices" className="mb-0">
          {t("admin.devices.listTitle")}
        </PageBackLink>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/devices/$deviceId/install" params={{ deviceId: device.deviceId }}>
            {t("admin.devices.openInstaller")}
          </Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <EntityKeyBadge>{device.deviceId}</EntityKeyBadge>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.devices.name")}</Label>
              <p className="text-xs text-muted-foreground">{t("admin.devices.nameHint")}</p>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">{t("admin.devices.site")}</Label>
              <select
                id="site"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">{t("admin.devices.unassigned")}</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp">{t("admin.devices.expectedInterval")}</Label>
              <Input id="exp" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep">{t("admin.devices.reportInterval")}</Label>
              <Input id="rep" value={report} onChange={(e) => setReport(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasCamera} onChange={() => setHasCamera((v) => !v)} />
              {t("admin.devices.hasCamera")}
            </label>
            {hasCamera ? (
              <div className="space-y-2">
                <Label htmlFor="snap">{t("admin.devices.snapshotInterval")}</Label>
                <Input id="snap" value={snapshot} onChange={(e) => setSnapshot(e.target.value)} />
              </div>
            ) : null}
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                <ButtonPendingLabel pending={isSaving}>{t("admin.shared.save")}</ButtonPendingLabel>
              </Button>
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void onDelete()}>
                <ButtonPendingLabel pending={isDeleting}>{t("admin.shared.delete")}</ButtonPendingLabel>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {device.hasCamera || (device.recentSnapshots?.length ?? 0) > 0 ? (
        <div className="mt-6">
          <AdminDeviceRecentSnapshots
            deviceId={device.deviceId}
            snapshots={device.recentSnapshots ?? []}
          />
        </div>
      ) : null}
    </>
  );
}
