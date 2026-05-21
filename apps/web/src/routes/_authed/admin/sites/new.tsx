import { createFileRoute } from "@tanstack/react-router";

import { AdminSiteNewPageContent } from "~/features/admin/sites/admin-site-new-page-content";

export const Route = createFileRoute("/_authed/admin/sites/new")({
  component: AdminSiteNewPageContent,
});
