/**
 * Create Menu - 创建菜单组件
 *
 * 提供创建各种资源的入口
 */

'use client';

import { useId, useRef, useState } from 'react';
import { Plus, User, Key, Box, Users, Settings, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';
import { useMemo } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useRole } from '@/hooks/use-role';
import { hasRequiredRole, type ManagementRole } from '@/lib/role-system';

interface CreateAction {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  href: string;
  section: 'identity' | 'resource' | 'system';
  requiredRole: ManagementRole;
}

interface CreateMenuProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export const CREATE_ACTIONS: CreateAction[] = [
  // Identity
  {
    id: 'create-agent',
    labelKey: 'createMenu.actions.agent',
    descriptionKey: 'createMenu.actions.agentDesc',
    icon: <User className="h-4 w-4" />,
    href: '/tokens',
    section: 'identity',
    requiredRole: 'admin',
  },
  {
    id: 'create-human',
    labelKey: 'createMenu.actions.operator',
    descriptionKey: 'createMenu.actions.operatorDesc',
    icon: <Users className="h-4 w-4" />,
    href: '/settings',
    section: 'identity',
    requiredRole: 'admin',
  },
  // Resource
  {
    id: 'create-token',
    labelKey: 'createMenu.actions.token',
    descriptionKey: 'createMenu.actions.tokenDesc',
    icon: <Key className="h-4 w-4" />,
    href: '/tokens',
    section: 'resource',
    requiredRole: 'admin',
  },
  {
    id: 'create-space',
    labelKey: 'createMenu.actions.space',
    descriptionKey: 'createMenu.actions.spaceDesc',
    icon: <Box className="h-4 w-4" />,
    href: '/spaces',
    section: 'resource',
    requiredRole: 'operator',
  },
  // System
  {
    id: 'system-settings',
    labelKey: 'createMenu.actions.setting',
    descriptionKey: 'createMenu.actions.settingDesc',
    icon: <Settings className="h-4 w-4" />,
    href: '/settings',
    section: 'system',
    requiredRole: 'admin',
  },
];

export function getCreateActionTargets(role: ManagementRole | null = 'admin') {
  return CREATE_ACTIONS.filter((action) => hasRequiredRole(role, action.requiredRole)).map(
    (action) => action.href
  );
}

export function CreateMenu({ variant = 'primary', size = 'sm' }: CreateMenuProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { role, isLoading } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: () => setIsOpen(false),
    onFocusOutside: () => setIsOpen(false),
  });

  const actions = useMemo(
    () =>
      CREATE_ACTIONS.filter((action) => hasRequiredRole(role, action.requiredRole)).map(
        (action) => ({
          ...action,
          label: t(action.labelKey),
          description: t(action.descriptionKey),
        })
      ),
    [role, t]
  );

  // 过滤操作
  const filteredActions = actions.filter(
    (action) =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const identityActions = filteredActions.filter((a) => a.section === 'identity');
  const resourceActions = filteredActions.filter((a) => a.section === 'resource');
  const systemActions = filteredActions.filter((a) => a.section === 'system');

  const handleAction = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (isLoading || actions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* 创建按钮 */}
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? dialogId : undefined}
        aria-label={t('createMenu.ariaLabel')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('createMenu.buttonLabel')}</span>
      </Button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={containerRef}
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={t('createMenu.ariaLabel')}
          className="absolute right-0 top-full z-dropdown mt-2 w-80 max-w-[calc(100vw-2rem)] animate-slide-up overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
        >
          {/* 头部搜索 */}
          <div className="border-b border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--kw-text)]">{t('createMenu.title')}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[var(--kw-text-muted)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)]"
                aria-label={t('createMenu.closeAriaLabel')}
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
                placeholder={t('createMenu.searchPlaceholder')}
                aria-label={t('createMenu.searchAriaLabel')}
                className="focus:ring-[var(--kw-primary-300)]/20 dark:focus:border-[var(--kw-dark-primary)]/50 dark:focus:ring-[var(--kw-dark-primary)]/20 w-full rounded-lg border border-transparent bg-[var(--kw-surface-alt)] py-2 pl-9 pr-3 text-sm text-[var(--kw-text)] transition-colors transition-shadow placeholder:text-[var(--kw-text-muted)] focus:border-[var(--kw-primary-300)] focus:ring-2 dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)] dark:placeholder:text-[var(--kw-dark-text-muted)]"
              />
              <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kw-text-muted)]" />
            </div>
          </div>

          {/* 操作列表 */}
          <div className="max-h-80 overflow-y-auto py-2">
            {/* Identities */}
            {identityActions.length > 0 && (
              <div className="mb-2 px-2">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--kw-text-muted)]">
                  {t('createMenu.sections.identity')}
                </p>
                {identityActions.map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] transition-colors group-hover:bg-[var(--kw-primary-200)] dark:bg-[var(--kw-dark-purple-accent-surface)] dark:text-[var(--kw-dark-primary)] dark:group-hover:bg-[var(--kw-dark-surface-alt)]">
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="truncate text-xs text-[var(--kw-text-muted)]">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--kw-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[var(--kw-dark-text-muted)]" />
                  </button>
                ))}
              </div>
            )}

            {/* Resources */}
            {resourceActions.length > 0 && (
              <div className="mb-2 px-2">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--kw-text-muted)]">
                  {t('createMenu.sections.resource')}
                </p>
                {resourceActions.map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)] transition-colors group-hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-purple-accent-surface)] dark:text-[var(--kw-dark-primary)] dark:group-hover:bg-[var(--kw-dark-surface-alt)]">
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="truncate text-xs text-[var(--kw-text-muted)]">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--kw-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[var(--kw-dark-text-muted)]" />
                  </button>
                ))}
              </div>
            )}

            {/* System */}
            {systemActions.length > 0 && (
              <div className="px-2">
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--kw-text-muted)]">
                  {t('createMenu.sections.system')}
                </p>
                {systemActions.map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-border)]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] transition-colors group-hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-text-muted)] dark:group-hover:bg-[var(--kw-dark-surface-alt)]">
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="truncate text-xs text-[var(--kw-text-muted)]">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--kw-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[var(--kw-dark-text-muted)]" />
                  </button>
                ))}
              </div>
            )}

            {/* 无结果 */}
            {filteredActions.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--kw-text-muted)]">{t('createMenu.noResults')}</p>
                <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                  {t('createMenu.noResultsHint')}
                </p>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="border-t border-[var(--kw-border)] bg-[var(--kw-surface-alt)] px-4 py-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]">
            <p className="text-xs text-[var(--kw-text-muted)]">
              {t('createMenu.closeHint')
                .split('<0>')
                .map((part, i) =>
                  i === 1 ? (
                    <kbd
                      key={i}
                      className="rounded border border-[var(--kw-border)] bg-white px-1.5 py-0.5 font-mono dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
                    >
                      {part.split('</0>')[0]}
                    </kbd>
                  ) : (
                    part.split('</0>')[0]
                  )
                )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
