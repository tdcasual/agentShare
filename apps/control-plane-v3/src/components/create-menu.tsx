/**
 * Create Menu - 创建菜单组件
 *
 * 提供创建各种资源的入口
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, User, Key, Box, Users, Settings, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui-primitives/button';

interface CreateAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  section: 'identity' | 'resource' | 'system';
}

interface CreateMenuProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export const CREATE_ACTIONS: CreateAction[] = [
  // Identity 创建
  {
    id: 'create-agent',
    label: 'Create Agent',
    description: 'Register a remote agent profile',
    icon: <User className="h-4 w-4" />,
    href: '/tokens',
    section: 'identity',
  },
  {
    id: 'create-human',
    label: 'Create Human',
    description: 'Add a human user identity',
    icon: <Users className="h-4 w-4" />,
    href: '/settings',
    section: 'identity',
  },
  // Resource 创建
  {
    id: 'create-token',
    label: 'Create Token',
    description: 'Generate remote access token',
    icon: <Key className="h-4 w-4" />,
    href: '/tokens',
    section: 'resource',
  },
  {
    id: 'create-space',
    label: 'Create Space',
    description: 'Set up a new workspace',
    icon: <Box className="h-4 w-4" />,
    href: '/spaces',
    section: 'resource',
  },
  // System
  {
    id: 'system-settings',
    label: 'System Settings',
    description: 'Configure platform settings',
    icon: <Settings className="h-4 w-4" />,
    href: '/settings',
    section: 'system',
  },
];

export function getCreateActionTargets() {
  return CREATE_ACTIONS.map((action) => action.href);
}

export function CreateMenu({ variant = 'primary', size = 'sm' }: CreateMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 过滤操作
  const filteredActions = CREATE_ACTIONS.filter(
    (action) =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const identityActions = filteredActions.filter((a) => a.section === 'identity');
  const resourceActions = filteredActions.filter((a) => a.section === 'resource');
  const systemActions = filteredActions.filter((a) => a.section === 'system');

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAction = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {/* 创建按钮 */}
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Create new item"
      >
        <Plus className={cn('h-4 w-4', size === 'sm' ? 'mr-1' : 'mr-2')} aria-hidden="true" />
        Create
      </Button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩 */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* 菜单面板 */}
          <div
            ref={menuRef}
            role="menu"
            aria-label="Create menu"
            className="absolute right-0 top-full z-50 mt-2 w-80 animate-slide-up overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl dark:border-[#3D3D5C] dark:bg-[#252540]"
          >
            {/* 头部搜索 */}
            <div className="border-b border-pink-100 p-4 dark:border-[#3D3D5C]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">Create New</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:text-[#9CA3AF] dark:hover:bg-[#3D3D5C]"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                  placeholder="Search create options..."
                  aria-label="Search create options"
                  className="w-full rounded-lg border border-transparent bg-gray-100 py-2 pl-9 pr-3 text-sm text-gray-800 transition-all placeholder:text-gray-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-300/20 dark:bg-[#1A1A2E] dark:text-[#E8E8EC] dark:placeholder:text-[#9CA3AF] dark:focus:border-[#E891C0]/50 dark:focus:ring-[#E891C0]/20"
                />
                <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#9CA3AF]" />
              </div>
            </div>

            {/* 操作列表 */}
            <div className="max-h-80 overflow-y-auto py-2">
              {/* Identities */}
              {identityActions.length > 0 && (
                <div className="mb-2 px-2">
                  <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF]">
                    Identities
                  </p>
                  {identityActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 transition-colors hover:bg-pink-50 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 text-pink-600 transition-colors group-hover:bg-pink-200 dark:bg-[#3D2D4A] dark:text-[#E891C0] dark:group-hover:bg-[#4D3D5A]">
                        {action.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-[#9CA3AF]">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#9CA3AF]" />
                    </button>
                  ))}
                </div>
              )}

              {/* Resources */}
              {resourceActions.length > 0 && (
                <div className="mb-2 px-2">
                  <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF]">
                    Resources
                  </p>
                  {resourceActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 transition-colors hover:bg-pink-50 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-200 dark:bg-[#3D2D4A] dark:text-purple-400 dark:group-hover:bg-[#4D3D5A]">
                        {action.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-[#9CA3AF]">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#9CA3AF]" />
                    </button>
                  ))}
                </div>
              )}

              {/* System */}
              {systemActions.length > 0 && (
                <div className="px-2">
                  <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF]">
                    System
                  </p>
                  {systemActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-700 transition-colors hover:bg-pink-50 dark:text-[#E8E8EC] dark:hover:bg-[#3D3D5C]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-gray-200 dark:bg-[#3D3D5C] dark:text-gray-400 dark:group-hover:bg-[#4D5D6C]">
                        {action.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-[#9CA3AF]">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#9CA3AF]" />
                    </button>
                  ))}
                </div>
              )}

              {/* 无结果 */}
              {filteredActions.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                    No create options found
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-[#9CA3AF]">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="border-t border-pink-100 bg-gray-50 px-4 py-3 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]">
              <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                Press{' '}
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono dark:border-[#3D3D5C] dark:bg-[#252540]">
                  ESC
                </kbd>{' '}
                to close
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
