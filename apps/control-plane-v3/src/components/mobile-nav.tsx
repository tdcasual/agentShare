'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { useIsMobile } from '@/hooks/use-device-type';
import {
  LayoutDashboard,
  Users,
  Globe,
  CheckSquare,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Settings,
} from 'lucide-react';

const getNavItems = (t: (key: string) => string) => [
  { href: '/', label: t('navigation.hub'), icon: LayoutDashboard },
  { href: '/identities', label: t('navigation.identities'), icon: Users },
  { href: '/spaces', label: t('navigation.spaces'), icon: Globe },
  { href: '/tokens', label: t('navigation.tokens'), icon: KeyRound },
  { href: '/tasks', label: t('navigation.tasks'), icon: CheckSquare },
  { href: '/reviews', label: t('navigation.reviews'), icon: ShieldCheck },
];

export function getMobileShellNavTargets() {
  return ['/', '/identities', '/spaces', '/tokens', '/tasks', '/reviews', '/settings'];
}

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const navItems = getNavItems(t);
  const [showMore, setShowMore] = React.useState(false);

  // 仅在移动端显示
  if (!isMobile) {
    return null;
  }

  // 只显示前4个主要导航项，其他放入"更多"
  const mainItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-pink-100 bg-white/90 backdrop-blur-md dark:border-[#3D3D5C] dark:bg-[#252540]/90">
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
                  'flex min-h-[44px] min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200',
                  isActive
                    ? 'bg-pink-50 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]'
                    : 'text-gray-500 hover:text-pink-500 dark:text-[#9CA3AF] dark:hover:text-[#E891C0]'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            aria-expanded={showMore}
            aria-haspopup="menu"
            aria-label={t('common.more') || 'More'}
            type="button"
            className={cn(
              'flex min-h-[44px] min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200',
              showMore
                ? 'bg-pink-50 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]'
                : 'text-gray-500 hover:text-pink-500 dark:text-[#9CA3AF] dark:hover:text-[#E891C0]'
            )}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t('common.more') || '更多'}</span>
          </button>
        </div>
      </nav>

      {/* More Menu Overlay */}
      {showMore && (
        <>
          <button
            className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40"
            aria-label="Close navigation menu"
            type="button"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up rounded-3xl border border-pink-100 bg-white shadow-2xl dark:border-[#3D3D5C] dark:bg-[#252540]">
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
                      'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200',
                      isActive
                        ? 'bg-pink-50 text-pink-700 dark:bg-[#3D3D5C] dark:text-[#E891C0]'
                        : 'text-gray-700 hover:bg-pink-50/50 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]/50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              <hr className="my-2 border-pink-100 dark:border-[#3D3D5C]" />

              <Link
                href="/settings"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-gray-700 transition-all duration-200 hover:bg-pink-50/50 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]/50"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">{t('navigation.settings')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
