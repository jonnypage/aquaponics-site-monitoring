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
import { Role } from "~/gql/generated/graphql";
import { useAdminSites, useAdminUsers } from "~/hooks/useAdmin";
import { useResetAdminUserPasswordMutate, useUpdateAdminUserMutate } from "~/hooks/useAdmin";
import { allSiteIdSet, assignedSiteIdsForSave } from "~/utils/admin-user-sites";
import { cn } from "~/utils/cn";

const routeApi = getRouteApi("/_authed/admin/users/$userId/edit");

export function AdminUserEditPageContent() {
  const { userId } = routeApi.useParams();
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

  const isAdminRole = role === Role.Admin;

  useEffect(() => {
    if (!user) {
      return;
    }
    setEmail(user.email);
    setName(user.name);
    setRole(user.role);
    if (user.role === Role.Admin && sites?.length) {
      setSelectedSites(allSiteIdSet(sites));
    } else {
      setSelectedSites(new Set(user.assignedSiteIds));
    }
  }, [user, sites]);

  function onRoleChange(next: Role) {
    setRole(next);
    if (next === Role.Admin && sites?.length) {
      setSelectedSites(allSiteIdSet(sites));
    }
  }

  function toggleSite(id: string) {
    if (isAdminRole) {
      return;
    }
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
        assignedSiteIds: assignedSiteIdsForSave(role, sites ?? [], selectedSites)
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
    return <LoadingIndicator className="py-12" />;
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
      <PageBackLink to="/admin/users">{t("admin.hub.usersTitle")}</PageBackLink>
      <Card className="w-full">
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
                onChange={(e) => onRoleChange(e.target.value as Role)}
              >
                <option value={Role.Admin}>Admin</option>
                <option value={Role.SiteManager}>Site manager</option>
                <option value={Role.SiteViewer}>Site viewer</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("admin.users.sites")}</p>
              {isAdminRole ? (
                <p className="text-sm text-muted-foreground">{t("admin.users.sitesAdminHint")}</p>
              ) : null}
              <div
                className={cn(
                  "max-h-48 space-y-2 overflow-y-auto rounded-md border p-3",
                  isAdminRole && "bg-muted/40 opacity-80"
                )}
              >
                {(sites ?? []).map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isAdminRole && "cursor-not-allowed text-muted-foreground"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isAdminRole || selectedSites.has(s.id)}
                      disabled={isAdminRole}
                      onChange={() => toggleSite(s.id)}
                    />
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
              <ButtonPendingLabel pending={isSaving || isResetting}>{t("admin.shared.save")}</ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
