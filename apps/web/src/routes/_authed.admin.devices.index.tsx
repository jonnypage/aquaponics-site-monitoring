import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useAdminDevices, useAdminSites } from "~/hooks/useAdmin";
import { formatRelativeTime } from "~/utils/format";

export const Route = createFileRoute("/_authed/admin/devices/")({
  component: AdminDevicesListPage
});

function AdminDevicesListPage() {
  const { t } = useTranslation();
  const { data: devices, isLoading, isError, error } = useAdminDevices();
  const { data: sites } = useAdminSites();
  const siteName = (id: string) => sites?.find((s) => s.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        title={t("admin.devices.listTitle")}
        actions={
          <Button asChild>
            <Link to="/admin/devices/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.devices.newTitle")}
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
          {(devices ?? []).map((d) => (
            <Card key={d.deviceId}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-medium">{d.deviceId}</p>
                  <p className="text-xs text-muted-foreground">
                    {siteName(d.siteId)} · {d.lastSeenAt ? formatRelativeTime(new Date(d.lastSeenAt)) : "—"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/devices/$deviceId/edit" params={{ deviceId: d.deviceId }}>
                    {t("admin.devices.editTitle")}
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
