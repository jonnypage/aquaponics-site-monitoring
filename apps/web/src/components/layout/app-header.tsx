import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Menu, Palette, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { ButtonPendingLabel } from '~/components/ui/loading-indicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useLogoutMutate } from '~/hooks/useAPI';
import {
  SUPPORTED_LANGUAGE_CODES,
  normalizeToSupportedLanguage,
} from '~/i18n/supported-languages';
import {
  DASHBOARD_THEME_MODES,
  type DashboardThemeMode,
} from '~/theme/dashboard-theme-storage';
import { useDashboardTheme } from '~/theme/theme-provider';

interface AppHeaderProps {
  userName: string;
  userEmail: string;
  onMobileMenuToggle: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AppHeader({
  userName,
  userEmail,
  onMobileMenuToggle,
}: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useDashboardTheme();
  const activeLng = normalizeToSupportedLanguage(
    i18n.resolvedLanguage ?? i18n.language,
  );
  const navigate = useNavigate();
  const { mutateAsync: mutateLogout, isPending: isLoggingOut } =
    useLogoutMutate();

  async function onLogout() {
    try {
      await mutateLogout();
    } finally {
      await navigate({ to: '/login' });
    }
  }

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 text-foreground md:px-6'>
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='icon'
          className='md:hidden'
          onClick={onMobileMenuToggle}
          aria-label={t('appHeader.toggleNavAria')}
        >
          <Menu className='h-5 w-5' />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-auto items-center gap-2 px-2 py-1'
          >
            <Avatar className='h-8 w-8'>
              <AvatarFallback className='bg-primary/10 text-primary'>
                {initials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className='hidden text-left md:block'>
              <p className='text-sm font-medium leading-none'>{userName}</p>
              <p className='text-xs text-muted-foreground'>{userEmail}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>
            <div>
              <p className='text-sm font-medium leading-none'>{userName}</p>
              <p className='mt-1 text-xs text-muted-foreground'>{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings" className="flex cursor-default items-center">
              <Settings className="mr-2 h-4 w-4" />
              {t('appHeader.settings')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className='text-xs font-normal text-muted-foreground'>
            {t('appHeader.languages.section')}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeLng}
            onValueChange={(code) => {
              void i18n.changeLanguage(code);
            }}
          >
            {SUPPORTED_LANGUAGE_CODES.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {t(`appHeader.languages.${code}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='gap-2'>
              <Palette className='h-4 w-4 shrink-0' />
              <span>{t('appHeader.theme.section')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className='p-1' sideOffset={4}>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(v) => setTheme(v as DashboardThemeMode)}
              >
                {DASHBOARD_THEME_MODES.map((mode) => (
                  <DropdownMenuRadioItem key={mode} value={mode}>
                    {t(`appHeader.theme.${mode}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} disabled={isLoggingOut}>
            <LogOut className='mr-2 h-4 w-4' />
            <ButtonPendingLabel pending={isLoggingOut}>
              {isLoggingOut ? t('appHeader.signingOut') : t('appHeader.signOut')}
            </ButtonPendingLabel>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
