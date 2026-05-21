import { getRouteApi, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

const routeApi = getRouteApi("/_authed/admin/devices/$deviceId/install");

export function AdminDeviceInstallPageContent() {
  const { deviceId } = routeApi.useParams();
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("admin.devices.installTitle")} description={t("admin.devices.installDescription")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/devices/$deviceId/edit" params={{ deviceId }}>
            {t("admin.devices.backToEdit")}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/devices">{t("admin.devices.listTitle")}</Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p className="font-mono text-xs text-foreground/80">{deviceId}</p>
          <p>{t("admin.devices.installBody")}</p>
        </CardContent>
      </Card>
    </>
  );
}
