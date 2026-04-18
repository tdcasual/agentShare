/**
 * Header - 全局顶部导航栏
 *
 * 包含：搜索、在线用户、创建菜单、通知、消息、用户菜单
 *
 * @CPRV3-MIGRATION: 已修复 - 使用真实功能的组件替代占位符
 * - Create 按钮: 使用 CreateMenu 组件提供真实创建选项
 * - 搜索: 使用 GlobalSearch 组件实现真实搜索功能
 * - 通知: 使用 Notifications 组件绑定真实数据
 */

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MessageSquare, User, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarGroup } from '@/shared/ui-primitives/avatar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
const GlobalSearch = dynamic(
  () => import('@/components/global-search').then((m) => m.GlobalSearch),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-64 animate-pulse rounded-full bg-[var(--kw-primary-100)]" />
    ),
  }
);
import { CreateMenu } from '@/components/create-menu';
import { Notifications } from '@/components/notifications';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';
import type { Identity } from '@/domains/identity/types';
import { useI18n } from '@/components/i18n-provider';
import { hasRequiredRole, isValidRole, type ManagementRole } from '@/lib/role-system';

interface HeaderProps {
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
}

const USER_MENU_ACTIONS = {
  profile: '/settings',
  settings: '/settings',
  logout: '/logout',
} as const;

export function getUserMenuTargets(role: ManagementRole | null = 'admin') {
  if (hasRequiredRole(role, 'admin')) {
    return [USER_MENU_ACTIONS.profile, USER_MENU_ACTIONS.settings, USER_MENU_ACTIONS.logout];
  }

  return [USER_MENU_ACTIONS.logout];
}

export function Header({ currentIdentity, onlineIdentities }: HeaderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const rawManagementRole = currentIdentity?.session?.managementRole;
  const managementRole: ManagementRole | null = isValidRole(rawManagementRole ?? '')
    ? (rawManagementRole as ManagementRole)
    : null;
  const showAdminControls = hasRequiredRole(managementRole, 'admin');

  useEffect(() => {
    if (!showUserMenu) {
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showUserMenu]);

  const { containerRef: userMenuRef } = useFocusTrap({
    isActive: showUserMenu,
    onEscape: () => setShowUserMenu(false),
  });

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center justify-between border-b border-[var(--kw-border)] bg-white px-6 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
      {/* Left - Search */}
      <div className="max-w-xl flex-1">
        <GlobalSearch />
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Language & Theme - Compact on mobile */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        {/* Online Users */}
        {onlineIdentities.length > 0 && (
          <div className="hidden items-center gap-2 rounded-full border border-[var(--kw-green-surface)] bg-[var(--kw-green-surface)] px-3 py-1.5 md:flex dark:border-[var(--kw-dark-success-surface)] dark:bg-[var(--kw-dark-green-accent-surface)]">
            <span
              className="ring-[var(--kw-agent-accent)]/40 h-2 w-2 rounded-full bg-[var(--kw-agent-accent)] ring-2"
              aria-hidden="true"
            />
            <span className="text-sm text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]">
              {t('common.onlineCount', { count: onlineIdentities.length })}
            </span>
            <AvatarGroup className="ml-1">
              {onlineIdentities.slice(0, 3).map((identity) => (
                <Avatar
                  key={identity.id}
                  src={identity.profile.avatar}
                  size="xs"
                  type={identity.type}
                />
              ))}
            </AvatarGroup>
          </div>
        )}

        {/* Create Button - 使用真实功能的 CreateMenu */}
        <CreateMenu variant="primary" size="sm" />

        {showAdminControls && (
          <>
            {/* Notifications - 使用真实数据绑定的 Notifications 组件 */}
            <Notifications />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  router.push('/inbox');
                  setShowUserMenu(false);
                }}
                aria-label={t('navigation.inbox')}
                className={cn(
                  'relative rounded-full p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
                  'text-[var(--kw-text-muted)] hover:bg-[var(--kw-primary-50)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)] dark:hover:text-[var(--kw-dark-primary)]'
                )}
              >
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* User Menu */}
        {currentIdentity && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
              }}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              aria-label={t('header.userMenuAriaLabel').replace(
                '{name}',
                currentIdentity.profile.name
              )}
              className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-[var(--kw-surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2 dark:hover:bg-[var(--kw-dark-border)]"
            >
              <Avatar
                src={currentIdentity.profile.avatar}
                type={currentIdentity.type}
                size="sm"
                status={currentIdentity.presence}
              />
              <span className="hidden text-sm font-medium text-[var(--kw-text)] md:block dark:text-[var(--kw-dark-text)]">
                {currentIdentity.profile.name}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-dropdown"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div
                  ref={userMenuRef}
                  role="menu"
                  aria-label={t('common.userMenu')}
                  className="absolute right-0 top-full z-dropdown mt-2 w-56 animate-slide-up overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
                >
                  <div className="border-b border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
                    <p className="font-semibold text-[var(--kw-text)]">
                      {currentIdentity.profile.name}
                    </p>
                    <p className="text-sm text-[var(--kw-text-muted)]">
                      {currentIdentity.type === 'human'
                        ? t('common.humanUser')
                        : t('common.aiAgent')}
                    </p>
                  </div>
                  <div className="p-2">
                    {showAdminControls && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => router.push(USER_MENU_ACTIONS.profile)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2 dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          <span>{t('common.profile')}</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => router.push(USER_MENU_ACTIONS.settings)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2 dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]"
                        >
                          <Settings className="h-4 w-4" aria-hidden="true" />
                          <span>{t('common.settings')}</span>
                        </button>
                        <hr className="my-2 border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]" />
                      </>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.logout)}
                      className="dark:hover:bg-[var(--kw-dark-error-surface)]/20 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[var(--kw-error)] transition-colors hover:bg-[var(--kw-rose-surface)] focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:text-[var(--kw-error)]"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>{t('common.signOut')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
