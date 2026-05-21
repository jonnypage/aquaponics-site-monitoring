import { createFileRoute } from '@tanstack/react-router';

import { SiteDetailPageContent } from '~/features/sites/site-detail-page-content';

export const Route = createFileRoute('/_authed/sites/$siteId')({
  component: SiteDetailPageContent,
});
