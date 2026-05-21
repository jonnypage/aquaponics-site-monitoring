import { createFileRoute } from "@tanstack/react-router";

import { AdminHubPageContent } from "~/features/admin/admin-hub-page-content";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminHubPageContent,
});
