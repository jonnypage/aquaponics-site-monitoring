import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel, LoadingIndicator } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AdminSensorIconField } from "~/components/admin/admin-sensor-icon-field";
import { useDeleteSensorCatalogEntryMutate, useSensorCatalog, useUpdateSensorCatalogEntryMutate } from "~/hooks/useAdmin";

const routeApi = getRouteApi("/_authed/admin/sensors/$sensorKey/edit");

export function AdminSensorEditPageContent() {
  const { sensorKey } = routeApi.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: catalog, isLoading } = useSensorCatalog();
  const { mutateAsync: updateRow, isPending: isSaving } = useUpdateSensorCatalogEntryMutate();
  const { mutateAsync: deleteRow, isPending: isDeleting } = useDeleteSensorCatalogEntryMutate();

  const row = useMemo(() => catalog?.find((c) => c.key === sensorKey), [catalog, sensorKey]);

  const [displayName, setDisplayName] = useState("");
  const [unit, setUnit] = useState("");
  const [physicalMin, setPhysicalMin] = useState("");
  const [physicalMax, setPhysicalMax] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [icon, setIcon] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) {
      return;
    }
    setDisplayName(row.displayName);
    setUnit(row.unit);
    setPhysicalMin(row.physicalMin != null ? String(row.physicalMin) : "");
    setPhysicalMax(row.physicalMax != null ? String(row.physicalMax) : "");
    setSortOrder(String(row.sortOrder));
    setIcon(row.icon ?? "");
  }, [row]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) {
      return;
    }
    setFormError(null);
    try {
      await updateRow({
        key: row.key,
        displayName,
        unit,
        physicalMin: physicalMin.trim() === "" ? null : Number(physicalMin),
        physicalMax: physicalMax.trim() === "" ? null : Number(physicalMax),
        sortOrder: Number.parseInt(sortOrder, 10),
        icon: icon.trim() || null
      });
      await navigate({ to: "/admin/sensors" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  async function onDelete() {
    if (!window.confirm(t("admin.sensors.deleteConfirm"))) {
      return;
    }
    try {
      await deleteRow(sensorKey);
      await navigate({ to: "/admin/sensors" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  if (isLoading || !catalog) {
    return <LoadingIndicator className="py-12" />;
  }
  if (!row) {
    return (
      <p className="text-sm text-destructive">
        {t("siteDetailPage.notFound")}{" "}
        <Link to="/admin/sensors" className="underline">
          {t("admin.sensors.listTitle")}
        </Link>
      </p>
    );
  }

  return (
    <>
      <PageHeader title={t("admin.sensors.editTitle")} />
      <PageBackLink to="/admin/sensors">{t("admin.sensors.listTitle")}</PageBackLink>
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="mb-4 font-mono text-sm text-muted-foreground">{row.key}</p>
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
                <Input id="so" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} required />
              </div>
            </div>
            <AdminSensorIconField id="ic" value={icon} onChange={setIcon} />
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
    </>
  );
}
