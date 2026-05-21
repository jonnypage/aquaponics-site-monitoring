import { createFileRoute } from '@tanstack/react-router';

import { AdminSiteEditPageContent } from '~/features/admin/sites/admin-site-edit-page-content';

export const Route = createFileRoute('/_authed/admin/sites/$siteId/edit')({
  component: AdminSiteEditPageContent,
});
