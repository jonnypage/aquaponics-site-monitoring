import { createFileRoute } from "@tanstack/react-router";

import { AdminSitesIndexPageContent } from "~/features/admin/sites/admin-sites-index-page-content";

export const Route = createFileRoute("/_authed/admin/sites/")({
  component: AdminSitesIndexPageContent,
});
