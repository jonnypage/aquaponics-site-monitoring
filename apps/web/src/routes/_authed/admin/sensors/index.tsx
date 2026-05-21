import { createFileRoute } from "@tanstack/react-router";

import { AdminSensorsIndexPageContent } from "~/features/admin/sensors/admin-sensors-index-page-content";

export const Route = createFileRoute("/_authed/admin/sensors/")({
  component: AdminSensorsIndexPageContent,
});
