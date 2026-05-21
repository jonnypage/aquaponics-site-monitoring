import { createFileRoute } from "@tanstack/react-router";

import { AdminUsersIndexPageContent } from "~/features/admin/users/admin-users-index-page-content";

export const Route = createFileRoute("/_authed/admin/users/")({
  component: AdminUsersIndexPageContent,
});
