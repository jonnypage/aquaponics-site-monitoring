import { createFileRoute } from "@tanstack/react-router";

import { AdminDeviceNewPageContent } from "~/features/admin/devices/admin-device-new-page-content";

export const Route = createFileRoute("/_authed/admin/devices/new")({
  component: AdminDeviceNewPageContent,
});
