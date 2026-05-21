import { createFileRoute } from "@tanstack/react-router";

import { AdminDevicesIndexPageContent } from "~/features/admin/devices/admin-devices-index-page-content";

export const Route = createFileRoute("/_authed/admin/devices/")({
  component: AdminDevicesIndexPageContent,
});
