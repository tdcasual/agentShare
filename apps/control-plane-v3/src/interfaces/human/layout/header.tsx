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
import { 
  MessageSquare, 
  User, 
  Settings, 
  LogOut,
  X,
} from 'lucide-react';
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
  return [
    USER_MENU_ACTIONS.profile,
    USER_MENU_ACTIONS.settings,
    USER_MENU_ACTIONS.logout,
  ];
}

export function Header({ currentIdentity, onlineIdentities }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // 焦点陷阱 refs
  const { containerRef: userMenuRef } = useFocusTrap({
    isActive: showUserMenu,
    onEscape: () => setShowUserMenu(false),
  });
  const { containerRef: messagesRef } = useFocusTrap({
    isActive: showMessages,
    onEscape: () => setShowMessages(false),
  });

  return (
    <header className="h-16 bg-white/80 dark:bg-[#252540]/80 backdrop-blur-md border-b border-pink-100 dark:border-[#3D3D5C] flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left - Search */}
      <div className="flex-1 max-w-xl">
        <GlobalSearch />
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Language & Theme - Compact on mobile */}
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        {/* Online Users */}
        {onlineIdentities.length > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-[#2D4A3D] border border-green-100 dark:border-green-800">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            <span className="text-sm text-green-700 dark:text-green-400">{onlineIdentities.length} online</span>
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

        {/* Messages - 简化实现，标记为即将推出 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMessages(!showMessages);
              setShowUserMenu(false);
            }}
            aria-expanded={showMessages}
            aria-haspopup="menu"
            aria-label="Messages"
            className={cn(
              'p-2.5 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
              showMessages
                ? 'bg-pink-50 dark:bg-[#3D3D5C] text-pink-600 dark:text-[#E891C0]'
                : 'text-gray-500 dark:text-[#9CA3AF] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] hover:text-pink-600 dark:hover:text-[#E891C0]'
            )}
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Messages Dropdown - 显示不可用状态 */}
          {showMessages && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMessages(false)}
                aria-hidden="true"
              />
              <div
                ref={messagesRef}
                role="menu"
                aria-label="Messages"
                className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up"
              >
                <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C] flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">Messages</h3>
                  <button
                    onClick={() => setShowMessages(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3D3D5C] text-gray-400 dark:text-[#9CA3AF] transition-colors"
                    aria-label="Close messages"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                    Messages coming soon
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                    Stay tuned for updates
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        {currentIdentity && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowMessages(false);
              }}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              aria-label={`User menu for ${currentIdentity.profile.name}`}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#3D3D5C] transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
            >
              <Avatar
                src={currentIdentity.profile.avatar}
                type={currentIdentity.type}
                size="sm"
                status={currentIdentity.presence}
              />
              <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">
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
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up"
                >
                  <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C]">
                    <p className="font-semibold text-gray-800 dark:text-[#E8E8EC]">{currentIdentity.profile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {currentIdentity.type === 'human' ? 'Human User' : 'AI Agent'}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.profile)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 text-left"
                    >
                      <User className="w-4 h-4" aria-hidden="true" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.settings)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 text-left"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-2 border-pink-100 dark:border-[#3D3D5C]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => router.push(USER_MENU_ACTIONS.logout)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 text-left"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
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
