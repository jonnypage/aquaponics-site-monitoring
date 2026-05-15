import { cn } from '~/utils/cn';

/** Public URL under `apps/web/public/org/` */
export const SITE_LOGO_SRC = '/org/UILogo.webp';

const variantClass: Record<'sidebar' | 'login', string> = {
  sidebar: 'h-14 w-auto max-w-[200px]',
  login: 'h-14 w-auto max-w-[240px]',
};

interface SiteLogoProps {
  variant: 'sidebar' | 'login';
  className?: string;
}

export function SiteLogo({ variant, className }: SiteLogoProps) {
  return (
    <img
      src={SITE_LOGO_SRC}
      alt=''
      decoding='async'
      className={cn(
        // White artwork: black in light theme, inverted when `html.dark` (class strategy)
        'object-contain object-left brightness-0 dark:brightness-100',
        variantClass[variant],
        className,
      )}
    />
  );
}
