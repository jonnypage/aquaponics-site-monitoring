import { createFileRoute } from "@tanstack/react-router";

import { requireGuest } from "~/api/session";
import { LoginPageContent } from "~/features/auth/login-page-content";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => requireGuest(context),
  component: LoginPageContent,
});
