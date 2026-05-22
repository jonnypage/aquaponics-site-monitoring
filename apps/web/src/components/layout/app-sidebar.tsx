import { Link, useLocation } from '@tanstack/react-router';
import {
  Bell,
  MapPin,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SiteLogo } from '~/components/branding/site-logo';
import { cn } from '~/utils/cn';

type NavItem = {
  labelKey: string;
  to: string;
  icon: LucideIcon;
};

type NavSection = {
  sectionKey: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    sectionKey: 'appSidebar.sections.monitoring',
    items: [
      {
        labelKey: 'appSidebar.links.sites',
        to: '/sites',
        icon: MapPin,
      },
      { labelKey: 'appSidebar.links.alerts', to: '/alerts', icon: Bell },
      // {
      //   labelKey: 'appSidebar.links.settings',
      //   to: '/settings',
      //   icon: Settings,
      // },
    ],
  },
];

const adminNavSection: NavSection = {
  sectionKey: 'appSidebar.sections.admin',
  items: [{ labelKey: 'appSidebar.links.admin', to: '/admin', icon: Shield }],
};

interface AppSidebarProps {
  className?: string;
  /** When true, removes the subtree from the accessibility tree and focus (e.g. closed mobile drawer). */
  inert?: boolean;
  showAdminNav?: boolean;
}

export function AppSidebar({
  className,
  inert,
  showAdminNav,
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const sections = showAdminNav
    ? [...navSections, adminNavSection]
    : navSections;

  return (
    <aside
      inert={inert === true ? true : undefined}
      className={cn(
        'flex h-full w-60 shrink-0 flex-col border-r border-border bg-background text-foreground',
        className,
      )}
    >
      <div className='flex h-16 items-center border-border px-4'>
        <Link
          to='/sites'
          aria-label={t('appSidebar.homeAria')}
          className='flex shrink-0 items-center rounded-md outline-none ring-ring focus-visible:ring-2'
        >
          <SiteLogo variant='sidebar' />
        </Link>
      </div>

      <nav className='flex-1 space-y-6 overflow-y-auto px-3 py-6'>
        {sections.map((section) => (
          <div key={section.sectionKey} className='space-y-1'>
            <p className='px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
              {t(section.sectionKey)}
            </p>
            {section.items.map((item) => {
              const active =
                pathname === item.to ||
                pathname.startsWith(`${item.to}/`) ||
                (item.to === '/admin' && pathname.startsWith('/admin'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
