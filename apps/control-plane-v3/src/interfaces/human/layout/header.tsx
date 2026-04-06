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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, User, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarGroup } from '@/shared/ui-primitives/avatar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { GlobalSearch } from '@/components/global-search';
import { CreateMenu } from '@/components/create-menu';
import { Notifications } from '@/components/notifications';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';
import type { Identity } from '@/domains/identity/types';

interface HeaderProps {
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
}

const USER_MENU_ACTIONS = {
  profile: '/settings',
  settings: '/settings',
  logout: '/logout',
} as const;

export function getUserMenuTargets() {
  return [USER_MENU_ACTIONS.profile, USER_MENU_ACTIONS.settings, USER_MENU_ACTIONS.logout];
}

export function Header({ currentIdentity, onlineIdentities }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { containerRef: userMenuRef } = useFocusTrap({
    isActive: showUserMenu,
    onEscape: () => setShowUserMenu(false),
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-pink-100 bg-white/80 px-6 backdrop-blur-md dark:border-[#3D3D5C] dark:bg-[#252540]/80">
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
          <div className="hidden items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 md:flex dark:border-green-800 dark:bg-[#2D4A3D]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" aria-hidden="true" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {onlineIdentities.length} online
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

        {/* Notifications - 使用真实数据绑定的 Notifications 组件 */}
        <Notifications />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              router.push('/inbox');
              setShowUserMenu(false);
            }}
            aria-label="Inbox"
            className={cn(
              'relative rounded-full p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
              'text-gray-500 hover:bg-pink-50 hover:text-pink-600 dark:text-[#9CA3AF] dark:hover:bg-[#3D3D5C] dark:hover:text-[#E891C0]'
            )}
          >
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

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
              aria-label={`User menu for ${currentIdentity.profile.name}`}
              className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:hover:bg-[#3D3D5C]"
            >
              <Avatar
                src={currentIdentity.profile.avatar}
                type={currentIdentity.type}
                size="sm"
                status={currentIdentity.presence}
              />
              <span className="hidden text-sm font-medium text-gray-700 md:block dark:text-[#E8E8EC]">
                {currentIdentity.profile.name}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  aria-hidden="true"
                />
                <div
                  ref={userMenuRef}
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 animate-slide-up overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl dark:border-[#3D3D5C] dark:bg-[#252540]"
                >
                  <div className="border-b border-pink-100 p-4 dark:border-[#3D3D5C]">
                    <p className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                      {currentIdentity.profile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {currentIdentity.type === 'human' ? 'Human User' : 'AI Agent'}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.profile)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-gray-700 transition-colors hover:bg-pink-50 focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.settings)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-gray-700 transition-colors hover:bg-pink-50 focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]"
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-2 border-pink-100 dark:border-[#3D3D5C]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.logout)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Sign out</span>
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
