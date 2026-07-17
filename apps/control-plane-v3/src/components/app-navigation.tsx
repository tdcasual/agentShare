'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  BookOpen,
  FileKey2,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from './i18n-provider';
import { SimpleThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'dashboard', icon: LayoutDashboard },
  { href: '/secrets', label: 'secrets', icon: FileKey2 },
  { href: '/agents', label: 'agents', icon: Bot },
  { href: '/audit', label: 'audit', icon: ShieldCheck },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex min-h-[64px] max-w-screen-2xl items-center gap-[8px] px-[12px] sm:gap-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 font-semibold tracking-tight"
          >
            <span
              className="flex h-[28px] w-[28px] items-center justify-center rounded-md bg-foreground text-background"
              aria-hidden="true"
            >
              <ShieldCheck className="h-[16px] w-[16px]" />
            </span>
            <span className="hidden min-[360px]:inline">VaultGate</span>
          </Link>

          <nav
            aria-label={t('navigation.label')}
            className="hidden min-w-0 flex-1 self-stretch md:block"
          >
            <div className="flex h-full items-center gap-1">
              {ITEMS.map(({ href, label }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                      active &&
                        'text-foreground after:absolute after:inset-x-3 after:bottom-[-11px] after:h-0.5 after:bg-primary'
                    )}
                  >
                    {t(`navigation.${label}`)}
                  </Link>
                );
              })}
              <Link
                href="/docs"
                aria-current={pathname.startsWith('/docs') ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname.startsWith('/docs') &&
                    'text-foreground after:absolute after:inset-x-3 after:bottom-[-11px] after:h-0.5 after:bg-primary'
                )}
              >
                {t('navigation.docs')}
              </Link>
              <Link
                href="/settings/management-tokens"
                aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname.startsWith('/settings') &&
                    'text-foreground after:absolute after:inset-x-3 after:bottom-[-11px] after:h-0.5 after:bg-primary'
                )}
              >
                {t('navigation.managementTokens')}
              </Link>
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SimpleThemeToggle className="border-transparent bg-transparent" />
            <Link
              href="/logout"
              className="hidden min-h-11 items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground md:flex"
            >
              <LogOut className="h-4 w-4" />
              {t('navigation.logout')}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                  aria-label={t('navigation.more')}
                >
                  <MoreHorizontal className="h-[20px] w-[20px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem asChild>
                  <Link href="/docs" className="min-h-11">
                    <BookOpen />
                    {t('navigation.docs')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/management-tokens" className="min-h-11">
                    <Settings />
                    {t('navigation.managementTokens')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/logout" className="min-h-11 text-destructive">
                    <LogOut />
                    {t('navigation.logout')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <nav
        aria-label={t('navigation.mobileLabel')}
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-foreground/75',
                  active && 'text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(`navigation.${label}`)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
