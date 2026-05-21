import { createFileRoute } from "@tanstack/react-router";

import { AlertsPageContent } from "~/features/alerts/alerts-page-content";

export const Route = createFileRoute("/_authed/alerts")({
  component: AlertsPageContent,
});
