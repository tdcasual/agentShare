'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from './i18n-provider';
import { cn } from '@/lib/utils';

const ITEMS = [
  ['/', 'dashboard'],
  ['/secrets', 'secrets'],
  ['/agents', 'agents'],
  ['/audit', 'audit'],
  ['/docs', 'docs'],
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          VaultGate
        </Link>
        <nav aria-label={t('navigation.label')} className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {ITEMS.map(([href, label]) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                    active && 'bg-accent text-foreground'
                  )}
                >
                  {t(`navigation.${label}`)}
                </Link>
              );
            })}
          </div>
        </nav>
        <Link href="/logout" className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm">
          {t('navigation.logout')}
        </Link>
      </div>
    </header>
  );
}
