import { createFileRoute } from '@tanstack/react-router';

import { SitesIndexPageContent } from '~/features/sites/sites-index-page-content';

export const Route = createFileRoute('/_authed/sites/')({
  component: SitesIndexPageContent,
});
