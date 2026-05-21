import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function AdminHubPageContent() {
  const { t } = useTranslation();
  const cards = [
    { to: "/admin/users" as const, titleKey: "admin.hub.usersTitle", descKey: "admin.hub.usersDesc" },
    { to: "/admin/sites" as const, titleKey: "admin.hub.sitesTitle", descKey: "admin.hub.sitesDesc" },
    { to: "/admin/devices" as const, titleKey: "admin.hub.devicesTitle", descKey: "admin.hub.devicesDesc" },
    { to: "/admin/sensors" as const, titleKey: "admin.hub.sensorsTitle", descKey: "admin.hub.sensorsDesc" }
  ];
  return (
    <>
      <PageHeader title={t("admin.hub.title")} description={t("admin.hub.description")} />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="block rounded-lg outline-none ring-ring focus-visible:ring-2">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{t(c.titleKey)}</CardTitle>
                <CardDescription>{t(c.descKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
