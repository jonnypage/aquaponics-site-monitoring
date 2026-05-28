import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AdminSensorIconField } from "~/components/admin/admin-sensor-icon-field";
import { SensorWiringEditor } from "~/components/admin/sensor-wiring-editor";
import { useCreateSensorCatalogEntryMutate } from "~/hooks/useAdmin";
import { slugSensorKeyFromModel, SENSOR_TYPE_OPTIONS } from "~/utils/sensor-display-label";
import {
  DEFAULT_SENSOR_WIRING_TEMPLATE,
  wiringTemplateForGraphql,
  type SensorWiringTemplate
} from "~/utils/sensor-wiring";
import type { SensorType } from "~/utils/sensor-types";

function parseOptFloat(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function AdminSensorNewPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: createRow, isPending } = useCreateSensorCatalogEntryMutate();

  const [sensorType, setSensorType] = useState<SensorType>("temperature");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [unit, setUnit] = useState("");
  const [physicalMin, setPhysicalMin] = useState("");
  const [physicalMax, setPhysicalMax] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [icon, setIcon] = useState("");
  const [wiringTemplate, setWiringTemplate] = useState<SensorWiringTemplate>({
    ...DEFAULT_SENSOR_WIRING_TEMPLATE,
    wires: [...DEFAULT_SENSOR_WIRING_TEMPLATE.wires]
  });
  const [formError, setFormError] = useState<string | null>(null);

  function onModelChange(next: string) {
    setModel(next);
    if (!keyTouched) {
      setKey(slugSensorKeyFromModel(next));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createRow({
        key,
        sensorType: sensorType as never,
        model,
        displayName,
        unit,
        physicalMin: parseOptFloat(physicalMin) ?? null,
        physicalMax: parseOptFloat(physicalMax) ?? null,
        sortOrder: sortOrder.trim() ? Number.parseInt(sortOrder, 10) : null,
        icon: icon.trim() || null,
        wiringTemplate: wiringTemplateForGraphql(wiringTemplate)
      });
      await navigate({ to: "/admin/sensors" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  return (
    <>
      <PageHeader title={t("admin.sensors.newTitle")} />
      <PageBackLink to="/admin/sensors">{t("admin.sensors.listTitle")}</PageBackLink>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="st">{t("admin.sensors.sensorType")}</Label>
              <select
                id="st"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sensorType}
                onChange={(e) => setSensorType(e.target.value as SensorType)}
                required
              >
                {SENSOR_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`sensorType.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">{t("admin.sensors.model")}</Label>
              <Input id="model" value={model} onChange={(e) => onModelChange(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k">{t("admin.sensors.key")}</Label>
              <Input
                id="k"
                className="font-mono"
                value={key}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">{t("admin.sensors.keyHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dn">{t("admin.sensors.displayName")}</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u">{t("admin.sensors.unit")}</Label>
              <Input id="u" value={unit} onChange={(e) => setUnit(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pmin">{t("admin.sensors.physicalMin")}</Label>
                <Input id="pmin" value={physicalMin} onChange={(e) => setPhysicalMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pmax">{t("admin.sensors.physicalMax")}</Label>
                <Input id="pmax" value={physicalMax} onChange={(e) => setPhysicalMax(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="so">{t("admin.sensors.sortOrder")}</Label>
                <Input id="so" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>
            <AdminSensorIconField id="ic" value={icon} onChange={setIcon} />
            <SensorWiringEditor value={wiringTemplate} onChange={setWiringTemplate} />
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>{t("admin.shared.create")}</ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
