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
    description: 'Register a new AI agent identity',
    icon: <User className="w-4 h-4" />,
    href: '/tokens',
    section: 'identity',
  },
  {
    id: 'create-human',
    label: 'Create Human',
    description: 'Add a human user identity',
    icon: <Users className="w-4 h-4" />,
    href: '/settings',
    section: 'identity',
  },
  // Resource 创建
  {
    id: 'create-token',
    label: 'Create Token',
    description: 'Generate API access token',
    icon: <Key className="w-4 h-4" />,
    href: '/tokens',
    section: 'resource',
  },
  {
    id: 'create-space',
    label: 'Create Space',
    description: 'Set up a new workspace',
    icon: <Box className="w-4 h-4" />,
    href: '/spaces',
    section: 'resource',
  },
  // System
  {
    id: 'system-settings',
    label: 'System Settings',
    description: 'Configure platform settings',
    icon: <Settings className="w-4 h-4" />,
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
  const filteredActions = CREATE_ACTIONS.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const identityActions = filteredActions.filter(a => a.section === 'identity');
  const resourceActions = filteredActions.filter(a => a.section === 'resource');
  const systemActions = filteredActions.filter(a => a.section === 'system');

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
        <Plus className={cn('w-4 h-4', size === 'sm' ? 'mr-1' : 'mr-2')} aria-hidden="true" />
        Create
      </Button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 菜单面板 */}
          <div
            ref={menuRef}
            role="menu"
            aria-label="Create menu"
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up"
          >
            {/* 头部搜索 */}
            <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                  Create New
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3D3D5C] text-gray-400 dark:text-[#9CA3AF] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
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
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-[#1A1A2E] border border-transparent focus:border-pink-300 dark:focus:border-[#E891C0]/50 focus:ring-2 focus:ring-pink-300/20 dark:focus:ring-[#E891C0]/20 text-sm text-gray-800 dark:text-[#E8E8EC] placeholder:text-gray-400 dark:placeholder:text-[#9CA3AF] transition-all"
                />
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" />
              </div>
            </div>

            {/* 操作列表 */}
            <div className="max-h-80 overflow-y-auto py-2">
              {/* Identities */}
              {identityActions.length > 0 && (
                <div className="px-2 mb-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
                    Identities
                  </p>
                  {identityActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-pink-100 dark:bg-[#3D2D4A] flex items-center justify-center text-pink-600 dark:text-[#E891C0] group-hover:bg-pink-200 dark:group-hover:bg-[#4D3D5A] transition-colors">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Resources */}
              {resourceActions.length > 0 && (
                <div className="px-2 mb-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
                    Resources
                  </p>
                  {resourceActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-[#3D2D4A] flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-[#4D3D5A] transition-colors">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* System */}
              {systemActions.length > 0 && (
                <div className="px-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
                    System
                  </p>
                  {systemActions.map((action) => (
                    <button
                      key={action.id}
                      role="menuitem"
                      onClick={() => handleAction(action.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-[#4D5D6C] transition-colors">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#1A1A2E] border-t border-pink-100 dark:border-[#3D3D5C]">
              <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#252540] rounded border border-gray-200 dark:border-[#3D3D5C] font-mono">ESC</kbd> to close
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
