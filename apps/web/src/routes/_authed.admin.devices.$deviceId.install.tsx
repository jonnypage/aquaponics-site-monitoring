import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export const Route = createFileRoute("/_authed/admin/devices/$deviceId/install")({
  component: AdminDeviceInstallStubPage
});

function AdminDeviceInstallStubPage() {
  const { deviceId } = Route.useParams();
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
      <Card className="max-w-xl">
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p className="font-mono text-xs text-foreground/80">{deviceId}</p>
          <p>{t("admin.devices.installBody")}</p>
        </CardContent>
      </Card>
    </>
  );
}
