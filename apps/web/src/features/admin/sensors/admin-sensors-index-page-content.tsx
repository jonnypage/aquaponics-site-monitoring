import { Link } from "@tanstack/react-router";
import { AlertTriangle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AdminSensorCatalogCard } from "~/components/admin/admin-sensor-catalog-card";
import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useSensorCatalog } from "~/hooks/useAdmin";
import type { SensorType } from "~/utils/sensor-types";

export function AdminSensorsIndexPageContent() {
  const { t } = useTranslation();
  const { data: rows, isLoading, isError, error } = useSensorCatalog();

  return (
    <>
      <PageHeader
        title={t("admin.sensors.listTitle")}
        actions={
          <Button asChild>
            <Link to="/admin/sensors/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.sensors.newTitle")}
            </Link>
          </Button>
        }
      />
      <PageBackLink to="/admin">{t("admin.shared.backToAdmin")}</PageBackLink>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("admin.shared.loadError", {
              message: error instanceof Error ? error.message : t("shared.unknownError")
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(rows ?? []).map((r) => (
            <AdminSensorCatalogCard
              key={r.key}
              sensorKey={r.key}
              sensorType={r.sensorType as SensorType}
              model={r.model}
              displayName={r.displayName}
              unit={r.unit}
              icon={r.icon}
            />
          ))}
        </div>
      )}
    </>
  );
}
