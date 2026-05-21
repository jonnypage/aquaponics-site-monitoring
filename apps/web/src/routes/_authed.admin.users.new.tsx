import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Role } from "~/gql/generated/graphql";
import { useAdminSites, useCreateAdminUserMutate } from "~/hooks/useAdmin";
import { allSiteIdSet, assignedSiteIdsForSave } from "~/utils/admin-user-sites";
import { cn } from "~/utils/cn";

export const Route = createFileRoute("/_authed/admin/users/new")({
  component: AdminUserNewPage
});

function AdminUserNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sites } = useAdminSites();
  const { mutateAsync: createUser, isPending } = useCreateAdminUserMutate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.SiteViewer);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  const isAdminRole = role === Role.Admin;

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
    setFormError(null);
    try {
      const u = await createUser({
        email,
        name,
        password,
        role,
        assignedSiteIds: assignedSiteIdsForSave(role, sites ?? [], selectedSites)
      });
      await navigate({ to: "/admin/users/$userId/edit", params: { userId: u.id } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  return (
    <>
      <PageHeader title={t("admin.users.newTitle")} />
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/users">{t("admin.hub.usersTitle")}</Link>
        </Button>
      </div>
      <Card className="w-full">
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("admin.users.email")}</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.users.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("admin.users.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
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
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>{t("admin.shared.create")}</ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
