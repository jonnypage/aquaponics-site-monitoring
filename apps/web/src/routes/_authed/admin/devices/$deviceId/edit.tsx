import { createFileRoute } from "@tanstack/react-router";

import { AdminDeviceEditPageContent } from "~/features/admin/devices/admin-device-edit-page-content";

export const Route = createFileRoute("/_authed/admin/devices/$deviceId/edit")({
  component: AdminDeviceEditPageContent,
});
