import { createFileRoute } from "@tanstack/react-router";

import { AdminDeviceInstallPageContent } from "~/features/admin/devices/admin-device-install-page-content";

export const Route = createFileRoute("/_authed/admin/devices/$deviceId/install")({
  component: AdminDeviceInstallPageContent,
});
