'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/settings/security', label: 'security', icon: ShieldCheck },
  { href: '/settings/management-tokens', label: 'managementTokens', icon: KeyRound },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t('settings.navigation.label')} className="border-b">
      <div className="flex gap-1 overflow-x-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                active &&
                  'text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(`settings.navigation.${label}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
