import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Role } from "~/gql/generated/graphql";
import { useAdminSites, useAdminUsers } from "~/hooks/useAdmin";
import { useResetAdminUserPasswordMutate, useUpdateAdminUserMutate } from "~/hooks/useAdmin";

export const Route = createFileRoute("/_authed/admin/users/$userId/edit")({
  component: AdminUserEditPage
});

function AdminUserEditPage() {
  const { userId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: users, isLoading } = useAdminUsers();
  const { data: sites } = useAdminSites();
  const { mutateAsync: updateUser, isPending: isSaving } = useUpdateAdminUserMutate();
  const { mutateAsync: resetPassword, isPending: isResetting } = useResetAdminUserPasswordMutate();

  const user = useMemo(() => users?.find((u) => u.id === userId), [users, userId]);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(Role.SiteViewer);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setEmail(user.email);
    setName(user.name);
    setRole(user.role);
    setSelectedSites(new Set(user.assignedSiteIds));
  }, [user]);

  function toggleSite(id: string) {
    setSelectedSites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      return;
    }
    setFormError(null);
    try {
      await updateUser({
        id: user.id,
        email,
        name,
        role,
        assignedSiteIds: Array.from(selectedSites)
      });
      if (newPassword.length >= 8) {
        await resetPassword({ id: user.id, newPassword });
        setNewPassword("");
      }
      await navigate({ to: "/admin/users" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  if (isLoading || !users) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }
  if (!user) {
    return (
      <p className="text-sm text-destructive">
        {t("siteDetailPage.notFound")}{" "}
        <Link to="/admin/users" className="underline">
          {t("admin.hub.usersTitle")}
        </Link>
      </p>
    );
  }

  return (
    <>
      <PageHeader title={t("admin.users.editTitle")} />
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/users">{t("admin.hub.usersTitle")}</Link>
        </Button>
      </div>
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("admin.users.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.users.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("admin.users.role")}</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value={Role.Admin}>Admin</option>
                <option value={Role.SiteManager}>Site manager</option>
                <option value={Role.SiteViewer}>Site viewer</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("admin.users.sites")}</p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {(sites ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedSites.has(s.id)} onChange={() => toggleSite(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="npw">{t("admin.users.resetPassword")}</Label>
              <Input
                id="npw"
                type="password"
                autoComplete="new-password"
                placeholder={t("admin.users.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">Min 8 characters. Leave empty to keep current password.</p>
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={isSaving || isResetting}>
              {isSaving || isResetting ? "…" : t("admin.shared.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
