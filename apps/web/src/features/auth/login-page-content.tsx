import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SiteLogo } from "~/components/branding/site-logo";
import { Button } from "~/components/ui/button";
import { ButtonPendingLabel } from "~/components/ui/loading-indicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useLoginMutate } from "~/hooks/useAPI";

export function LoginPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await mutateLogin({ email, password });
      await navigate({ to: "/sites" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.loginFailed"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex justify-center">
            <SiteLogo variant="login" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">{t("login.title")}</CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoginPending} className="w-full">
              <ButtonPendingLabel pending={isLoginPending}>
                {isLoginPending ? t("login.signingIn") : t("login.submit")}
              </ButtonPendingLabel>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
