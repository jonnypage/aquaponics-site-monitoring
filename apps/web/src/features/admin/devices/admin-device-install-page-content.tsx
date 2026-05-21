import { getRouteApi } from "@tanstack/react-router";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DurationField } from "~/components/admin/duration-field";
import { InstallSensorPinsFieldset } from "~/components/admin/install-sensor-pins-fieldset";
import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel, LoadingIndicator } from "~/components/ui/loading-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useAdminDevice,
  useAdminSites,
  useRotateAdminDeviceApiKeyMutate,
  useSensorCatalog,
  useUpdateAdminDeviceMutate
} from "~/hooks/useAdmin";
import {
  buildFirmwarePins,
  DEFAULT_SENSOR_PINS,
  hasIncludedPinnedSensor,
  type InstallSensorRow
} from "~/utils/firmware-sensor-pins";
import { getPublicApiOrigin } from "~/utils/api-origin";
import {
  clearDeviceInstallApiKey,
  readDeviceInstallApiKey,
  writeDeviceInstallApiKey
} from "~/utils/device-install-api-key";
import {
  DEFAULT_REPORT_DURATION,
  DEFAULT_REPORT_INTERVAL_SECONDS,
  DEFAULT_SNAPSHOT_DURATION,
  DEFAULT_SNAPSHOT_INTERVAL_SECONDS,
  durationToSeconds,
  secondsToDuration,
  type DurationValue
} from "~/utils/duration-input";
import {
  patchFirmwareConfig,
  type EspWebToolsManifest,
  type FirmwareDeviceConfig
} from "~/utils/firmware-config-patch";

import "esp-web-tools";

const FIRMWARE_URL = "/firmware/esp8266/firmware.bin";

const routeApi = getRouteApi("/_authed/admin/devices/$deviceId/install");

function buildInitialSensorRows(
  siteReporting:
    | ReadonlyArray<{
        sensorKey: string;
        enabled: boolean;
        displayName: string;
        sortOrder: number;
        icon?: string | null;
      }>
    | undefined,
  catalog:
    | ReadonlyArray<{
        key: string;
        displayName: string;
        sortOrder: number;
        icon?: string | null;
      }>
    | undefined,
  unassignedSite: boolean
): InstallSensorRow[] {
  if (!unassignedSite && siteReporting?.length) {
    return [...siteReporting]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({
        sensorKey: r.sensorKey,
        displayName: r.displayName,
        icon: r.icon ?? null,
        sortOrder: r.sortOrder,
        siteEnabled: r.enabled,
        included: r.enabled,
        pin: DEFAULT_SENSOR_PINS[r.sensorKey] ?? ""
      }));
  }
  if (!catalog?.length) {
    return [];
  }
  return [...catalog]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      sensorKey: c.key,
      displayName: c.displayName,
      icon: c.icon ?? null,
      sortOrder: c.sortOrder,
      siteEnabled: true,
      included: true,
      pin: DEFAULT_SENSOR_PINS[c.key] ?? ""
    }));
}

export function AdminDeviceInstallPageContent() {
  const { deviceId } = routeApi.useParams();
  const { t } = useTranslation();
  const apiOrigin = getPublicApiOrigin();
  const { data: device, isLoading, isError, error } = useAdminDevice(deviceId);
  const { data: sites } = useAdminSites();
  const { data: catalog } = useSensorCatalog();
  const { mutateAsync: updateDevice, isPending: isSaving } = useUpdateAdminDeviceMutate();
  const { mutateAsync: rotateKey, isPending: isRotatingKey } = useRotateAdminDeviceApiKeyMutate();

  const installRef = useRef<HTMLElement & { manifest?: EspWebToolsManifest | string }>(null);

  const [board, setBoard] = useState<"esp8266" | "esp32-cyd">("esp8266");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [reportDuration, setReportDuration] = useState<DurationValue>(DEFAULT_REPORT_DURATION);
  const [snapshotDuration, setSnapshotDuration] = useState<DurationValue>(DEFAULT_SNAPSHOT_DURATION);
  const [sensorRows, setSensorRows] = useState<InstallSensorRow[]>([]);
  const [sensorsInitKey, setSensorsInitKey] = useState("");

  const [firmwareLoading, setFirmwareLoading] = useState(false);
  const [firmwareError, setFirmwareError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<EspWebToolsManifest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "flash">("form");

  useEffect(() => {
    const key = readDeviceInstallApiKey(deviceId);
    if (key) {
      setApiKey(key);
    }
  }, [deviceId]);

  const assignedSite = useMemo(
    () => (device?.siteId ? sites?.find((s) => s.id === device.siteId) : undefined),
    [device?.siteId, sites]
  );

  useEffect(() => {
    if (!device) {
      return;
    }
    const initKey = `${device.deviceId}:${device.siteId ?? "none"}`;
    if (sensorsInitKey === initKey) {
      return;
    }
    if (!device.siteId && !catalog?.length) {
      return;
    }
    if (device.siteId && !assignedSite?.sensorReporting?.length && !catalog?.length) {
      return;
    }
    setSensorRows(
      buildInitialSensorRows(
        assignedSite?.sensorReporting,
        catalog,
        device.siteId == null
      )
    );
    setSensorsInitKey(initKey);
  }, [assignedSite, catalog, device, sensorsInitKey]);

  useEffect(() => {
    if (!device) {
      return;
    }
    setHasCamera(device.hasCamera);
    if (device.lastSeenAt == null) {
      setReportDuration(DEFAULT_REPORT_DURATION);
      setSnapshotDuration(DEFAULT_SNAPSHOT_DURATION);
    } else {
      setReportDuration(secondsToDuration(device.reportIntervalSeconds));
      setSnapshotDuration(secondsToDuration(device.snapshotIntervalSeconds));
    }
  }, [device]);

  const canPrepare = useMemo(() => {
    return (
      board === "esp8266" &&
      wifiSsid.trim() !== "" &&
      hasIncludedPinnedSensor(sensorRows)
    );
  }, [board, sensorRows, wifiSsid]);

  async function resolveInstallApiKey(): Promise<string> {
    const existing = apiKey.trim() || readDeviceInstallApiKey(deviceId);
    if (existing) {
      return existing;
    }
    const r = await rotateKey(deviceId);
    writeDeviceInstallApiKey(deviceId, r.plainApiKey);
    setApiKey(r.plainApiKey);
    return r.plainApiKey;
  }

  async function onPrepareFlash(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFirmwareError(null);

    if (!device) {
      return;
    }
    if (!canPrepare) {
      setFormError(t("admin.devices.installValidation"));
      return;
    }

    const reportIntervalSeconds = durationToSeconds(
      reportDuration,
      DEFAULT_REPORT_INTERVAL_SECONDS
    );
    const snapshotIntervalSeconds = durationToSeconds(
      snapshotDuration,
      DEFAULT_SNAPSHOT_INTERVAL_SECONDS
    );

    try {
      await updateDevice({
        deviceId: device.deviceId,
        reportIntervalSeconds,
        snapshotIntervalSeconds,
        hasCamera
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
      return;
    }

    setFirmwareLoading(true);
    try {
      const installApiKey = await resolveInstallApiKey();
      const res = await fetch(FIRMWARE_URL);
      if (!res.ok) {
        throw new Error(`Failed to load firmware (${res.status})`);
      }
      const buf = await res.arrayBuffer();
      const config: FirmwareDeviceConfig = {
        v: 1,
        deviceId,
        apiKey: installApiKey,
        apiOrigin,
        wifiSsid: wifiSsid.trim(),
        wifiPassword: wifiPassword,
        pins: buildFirmwarePins(sensorRows),
        hasCamera
      };
      const { manifest: m } = patchFirmwareConfig(buf, config, "aquaponics-node");
      setManifest(m);
      clearDeviceInstallApiKey(deviceId);
      setStep("flash");
    } catch (err) {
      setFirmwareError(err instanceof Error ? err.message : t("shared.unknownError"));
    } finally {
      setFirmwareLoading(false);
    }
  }

  useEffect(() => {
    if (step !== "flash" || !manifest || !installRef.current) {
      return;
    }
    installRef.current.manifest = manifest;
  }, [step, manifest]);

  if (isLoading) {
    return <LoadingIndicator label={t("shared.loading")} />;
  }

  if (isError || !device) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : t("shared.unknownError")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title={t("admin.devices.installTitle")} description={t("admin.devices.installDescription")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PageBackLink to="/admin/devices/$deviceId/edit" params={{ deviceId }} className="mb-0">
          {t("admin.devices.backToEdit")}
        </PageBackLink>
        <PageBackLink to="/admin/devices" className="mb-0">
          {t("admin.devices.listTitle")}
        </PageBackLink>
      </div>

      {step === "form" ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.devices.installFormTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void onPrepareFlash(e)}>
              <div className="space-y-2">
                <Label htmlFor="board">{t("admin.devices.installBoard")}</Label>
                <select
                  id="board"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={board}
                  onChange={(e) => setBoard(e.target.value as "esp8266" | "esp32-cyd")}
                >
                  <option value="esp8266">ESP8266 (D1 mini)</option>
                  <option value="esp32-cyd" disabled>
                    ESP32 CYD — {t("admin.devices.installBoardComingSoon")}
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifiSsid">{t("admin.devices.installWifiSsid")}</Label>
                <p className="text-xs text-muted-foreground">{t("admin.devices.installWifiSsidHint")}</p>
                <Input id="wifiSsid" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifiPassword">{t("admin.devices.installWifiPassword")}</Label>
                <p className="text-xs text-muted-foreground">{t("admin.devices.installWifiPasswordHint")}</p>
                <Input
                  id="wifiPassword"
                  type="password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <InstallSensorPinsFieldset
                rows={sensorRows}
                onChange={setSensorRows}
                unassignedSite={device.siteId == null}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasCamera}
                  onChange={(e) => setHasCamera(e.target.checked)}
                  className="rounded border-input"
                />
                {t("admin.devices.hasCamera")}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <DurationField
                  id="report"
                  label={t("admin.devices.reportInterval")}
                  value={reportDuration}
                  onChange={setReportDuration}
                />
                <DurationField
                  id="snapshot"
                  label={t("admin.devices.snapshotInterval")}
                  value={snapshotDuration}
                  onChange={setSnapshotDuration}
                />
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              {firmwareError ? <p className="text-sm text-destructive">{firmwareError}</p> : null}

              <Button type="submit" disabled={!canPrepare || firmwareLoading || isSaving || isRotatingKey}>
                <ButtonPendingLabel pending={firmwareLoading || isSaving || isRotatingKey}>
                  {firmwareLoading || isSaving
                    ? t("admin.devices.installPreparing")
                    : t("admin.devices.installContinue")}
                </ButtonPendingLabel>
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.devices.installFlashTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("admin.devices.installFlashHint")}</p>
            {createElement("esp-web-tools-install-button", { ref: installRef })}
            <Button type="button" variant="outline" onClick={() => setStep("form")}>
              {t("admin.devices.installBackToForm")}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
