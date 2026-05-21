import { createFileRoute } from "@tanstack/react-router";

import { AdminUserNewPageContent } from "~/features/admin/users/admin-user-new-page-content";

export const Route = createFileRoute("/_authed/admin/users/new")({
  component: AdminUserNewPageContent,
});
