'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { useIsMobile } from '@/hooks/use-device-type';
import { useRole } from '@/hooks/use-role';
import { hasRequiredRole, type ManagementRole } from '@/lib/role-system';
import { Sparkles, Settings } from 'lucide-react';
import { getVisibleShellNavItems } from '@/lib/control-plane-links';

export function getMobileShellNavTargets(role: ManagementRole | null = 'admin') {
  return getVisibleShellNavItems(role, { includeSettings: false }).map((item) => item.href);
}

export function shouldRenderMobileNavMoreButton(role: ManagementRole | null = 'admin') {
  return getMobileShellNavTargets(role).length > 4 || hasRequiredRole(role, 'admin');
}

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { role } = useRole();
  const isMobile = useIsMobile();
  const navItems = getVisibleShellNavItems(role, { includeSettings: false }).map((item) => ({
    href: item.href,
    label: t(item.labelKey),
    icon: item.icon,
  }));
  const [showMore, setShowMore] = React.useState(false);

  // 仅在移动端显示
  if (!isMobile) {
    return null;
  }

  // 只显示前4个主要导航项，其他放入"更多"
  const showMoreButton = shouldRenderMobileNavMoreButton(role);
  const primarySlotCount = showMoreButton ? 4 : navItems.length;
  const mainItems = navItems.slice(0, primarySlotCount);
  const moreItems = navItems.slice(primarySlotCount);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-drawer border-t border-[var(--kw-border)] bg-white dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
        <div className="flex items-center justify-around px-2 py-2">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] min-w-[52px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors duration-200 sm:min-w-[64px] sm:px-3',
                  isActive
                    ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
                    : 'text-[var(--kw-text-muted)] hover:text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-text-muted)] dark:hover:text-[var(--kw-dark-primary)]'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] font-medium sm:text-[11px]">{item.label}</span>
              </Link>
            );
          })}

          {showMoreButton ? (
            <button
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
              aria-haspopup="dialog"
              aria-label={t('common.more') || 'More'}
              type="button"
              className={cn(
                'flex min-h-[44px] min-w-[52px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors duration-200 sm:min-w-[64px] sm:px-3',
                showMore
                  ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
                  : 'text-[var(--kw-text-muted)] hover:text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-text-muted)] dark:hover:text-[var(--kw-dark-primary)]'
              )}
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-[10px] font-medium sm:text-[11px]">{t('common.more') || '更多'}</span>
            </button>
          ) : null}
        </div>
      </nav>

      {/* More Menu Overlay */}
      {showMoreButton && showMore && (
        <>
          <button
            className="fixed inset-0 z-dropdown bg-black/20 dark:bg-black/40"
            aria-label={t('common.closeNavigationMenu')}
            type="button"
            onClick={() => setShowMore(false)}
          />
          <div
            role="dialog"
            aria-label={t('common.more') || 'More'}
            className="fixed bottom-20 left-4 right-4 z-dropdown max-h-[60vh] animate-slide-up overflow-y-auto rounded-2xl border border-[var(--kw-border)] bg-white shadow-2xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
          >
            <div className="space-y-1 p-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-200',
                      isActive
                        ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
                        : 'hover:bg-[var(--kw-primary-50)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50 text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <hr className="my-2 border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]" />

              {hasRequiredRole(role, 'admin') && (
                <Link
                  href="/settings"
                  onClick={() => setShowMore(false)}
                  className="hover:bg-[var(--kw-primary-50)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50 flex items-center gap-3 rounded-xl px-4 py-3 text-[var(--kw-text)] transition-colors duration-200 dark:text-[var(--kw-dark-text)]"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">{t('navigation.settings')}</span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
