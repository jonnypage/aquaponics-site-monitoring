import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageBackLink } from "~/components/layout/page-back-link";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAdminSites, useCreateAdminDeviceMutate } from "~/hooks/useAdmin";
import { writeDeviceInstallApiKey } from "~/utils/device-install-api-key";

export function AdminDeviceNewPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sites } = useAdminSites();
  const { mutateAsync: createDevice, isPending } = useCreateAdminDeviceMutate();

  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const r = await createDevice({
        name: name.trim() ? name.trim() : null,
        siteId: siteId.trim() ? siteId : null
      });
      writeDeviceInstallApiKey(r.device.deviceId, r.plainApiKey);
      await navigate({
        to: "/admin/devices/$deviceId/install",
        params: { deviceId: r.device.deviceId }
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  return (
    <>
      <PageHeader title={t("admin.devices.newTitle")} />
      <PageBackLink to="/admin/devices">{t("admin.devices.listTitle")}</PageBackLink>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.devices.name")}</Label>
              <p className="text-xs text-muted-foreground">{t("admin.devices.nameHint")}</p>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">{t("admin.devices.site")}</Label>
              <p className="text-xs text-muted-foreground">{t("admin.devices.siteOptionalHint")}</p>
              <select
                id="site"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">{t("admin.devices.unassigned")}</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>{t("admin.devices.createAndInstall")}</ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
