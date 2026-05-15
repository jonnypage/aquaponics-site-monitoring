import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SensorIcon } from "~/components/sensor-icon";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useSensorCatalog } from "~/hooks/useAdmin";

export const Route = createFileRoute("/_authed/admin/sensors/")({
  component: AdminSensorsListPage
});

function AdminSensorsListPage() {
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
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin" className="inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("admin.shared.backToAdmin")}
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
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
        <div className="space-y-2">
          {(rows ?? []).map((r) => (
            <Card key={r.key}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {r.icon ? <SensorIcon name={r.icon} className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /> : null}
                  <div>
                    <p className="font-mono text-sm font-medium">{r.key}</p>
                    <p className="text-sm">
                      {r.displayName} <span className="text-muted-foreground">({r.unit})</span>
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/sensors/$sensorKey/edit" params={{ sensorKey: r.key }}>
                    {t("admin.sensors.editTitle")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
