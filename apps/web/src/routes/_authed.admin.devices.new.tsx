import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAdminSites, useCreateAdminDeviceMutate } from "~/hooks/useAdmin";

export const Route = createFileRoute("/_authed/admin/devices/new")({
  component: AdminDeviceNewPage
});

function AdminDeviceNewPage() {
  const { t } = useTranslation();
  const { data: sites } = useAdminSites();
  const { mutateAsync: createDevice, isPending } = useCreateAdminDeviceMutate();

  const [siteId, setSiteId] = useState("");
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const r = await createDevice({ siteId });
      setPlainKey(r.plainApiKey);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  return (
    <>
      <PageHeader title={t("admin.devices.newTitle")} />
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/devices">{t("admin.devices.listTitle")}</Link>
        </Button>
      </div>
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          {plainKey ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("admin.devices.plainKeyTitle")}</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{plainKey}</pre>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(plainKey);
                }}
              >
                {t("admin.shared.copyKey")}
              </Button>
              <Button type="button" asChild>
                <Link to="/admin/devices">{t("admin.devices.listTitle")}</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="site">{t("admin.devices.site")}</Label>
                <select
                  id="site"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                >
                  <option value="">—</option>
                  {(sites ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" disabled={isPending || !siteId}>
                {isPending ? "…" : t("admin.shared.create")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
