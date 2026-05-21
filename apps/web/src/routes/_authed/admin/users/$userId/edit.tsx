import { createFileRoute } from "@tanstack/react-router";

import { AdminUserEditPageContent } from "~/features/admin/users/admin-user-edit-page-content";

export const Route = createFileRoute("/_authed/admin/users/$userId/edit")({
  component: AdminUserEditPageContent,
});
