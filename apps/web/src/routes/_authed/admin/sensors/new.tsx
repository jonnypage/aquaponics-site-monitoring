import { createFileRoute } from "@tanstack/react-router";

import { AdminSensorNewPageContent } from "~/features/admin/sensors/admin-sensor-new-page-content";

export const Route = createFileRoute("/_authed/admin/sensors/new")({
  component: AdminSensorNewPageContent,
});
