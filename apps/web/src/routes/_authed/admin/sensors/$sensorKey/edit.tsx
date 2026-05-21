import { createFileRoute } from "@tanstack/react-router";

import { AdminSensorEditPageContent } from "~/features/admin/sensors/admin-sensor-edit-page-content";

export const Route = createFileRoute("/_authed/admin/sensors/$sensorKey/edit")({
  component: AdminSensorEditPageContent,
});
