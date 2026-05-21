import { createFileRoute } from "@tanstack/react-router";

import { SettingsPageContent } from "~/features/settings/settings-page-content";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsPageContent,
});
