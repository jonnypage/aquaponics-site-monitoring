import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AdminSensorIconField } from "~/components/admin/admin-sensor-icon-field";
import { useCreateSensorCatalogEntryMutate } from "~/hooks/useAdmin";

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

  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [unit, setUnit] = useState("");
  const [physicalMin, setPhysicalMin] = useState("");
  const [physicalMax, setPhysicalMax] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [icon, setIcon] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createRow({
        key,
        displayName,
        unit,
        physicalMin: parseOptFloat(physicalMin) ?? null,
        physicalMax: parseOptFloat(physicalMax) ?? null,
        sortOrder: sortOrder.trim() ? Number.parseInt(sortOrder, 10) : null,
        icon: icon.trim() || null
      });
      await navigate({ to: "/admin/sensors" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  return (
    <>
      <PageHeader title={t("admin.sensors.newTitle")} />
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/sensors">{t("admin.sensors.listTitle")}</Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="k">{t("admin.sensors.key")}</Label>
              <Input id="k" className="font-mono" value={key} onChange={(e) => setKey(e.target.value)} required />
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
