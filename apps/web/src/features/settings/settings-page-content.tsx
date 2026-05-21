import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel, LoadingIndicator } from "~/components/ui/loading-indicator";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useMe, useUpdateMeMutate } from "~/hooks/useAPI";

export function SettingsPageContent() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useMe();
  const { mutateAsync: updateMe, isPending } = useUpdateMeMutate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!user) {
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setFormError(t("settingsPage.passwordMismatch"));
        return;
      }
      if (newPassword.length > 0 && newPassword.length < 8) {
        setFormError(t("settingsPage.passwordTooShort"));
        return;
      }
    }

    const input: { currentPassword: string; name?: string; email?: string; newPassword?: string } = {
      currentPassword
    };
    if (name.trim() !== user.name) {
      input.name = name.trim();
    }
    const em = email.toLowerCase().trim();
    if (em !== user.email) {
      input.email = em;
    }
    if (newPassword.trim()) {
      input.newPassword = newPassword.trim();
    }

    if (!input.name && !input.email && !input.newPassword) {
      setFormError(t("settingsPage.nothingToUpdate"));
      return;
    }

    try {
      await updateMe(input);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("shared.unknownError"));
    }
  }

  if (isLoading || !user) {
    return <LoadingIndicator className="py-12" />;
  }

  return (
    <>
      <PageHeader title={t("settingsPage.title")} description={t("settingsPage.description")} />
      <Card className="max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="settings-name">{t("settingsPage.name")}</Label>
              <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">{t("settingsPage.email")}</Label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-current">{t("settingsPage.currentPassword")}</Label>
              <Input
                id="settings-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-new">{t("settingsPage.newPassword")}</Label>
              <Input
                id="settings-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-confirm">{t("settingsPage.confirmPassword")}</Label>
              <Input
                id="settings-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={isPending}>
              <ButtonPendingLabel pending={isPending}>{t("settingsPage.save")}</ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
