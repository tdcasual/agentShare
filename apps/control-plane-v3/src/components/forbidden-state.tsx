/**
 * Forbidden State - 403禁止访问状态
 *
 * Kawaii风格的403页面组件
 * 显示当前角色和所需角色的对比
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';

import { useI18n } from '@/components/i18n-provider';
import { useRole } from '@/hooks/use-role';
import { ROLE_LABELS, type ManagementRole } from '@/lib/role-system';
import { Lock, ArrowLeft, Home } from 'lucide-react';

interface ForbiddenStateProps {
  /** 需要的角色 */
  requiredRole: ManagementRole;
  /** 资源名称（可选） */
  resourceName?: string;
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 自定义标题 */
  title?: string;
}

export function ForbiddenState({
  requiredRole,
  resourceName,
  showBackButton = true,
  title,
}: ForbiddenStateProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { role, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[var(--kw-primary-200)]" />
          <div className="h-4 w-32 rounded bg-[var(--kw-primary-200)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card
        variant="kawaii"
        decoration
        className="w-full max-w-md animate-scale-in text-center"
        role="alert"
        aria-live="polite"
      >
        {/* 图标 */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[var(--kw-primary-100)] to-[var(--kw-purple-surface)] dark:from-[var(--kw-dark-pink-surface)] dark:to-[var(--kw-dark-purple-surface)]">
          <Lock className="h-12 w-12 animate-pulse text-[var(--kw-primary-500)]" />
        </div>

        {/* 标题 */}
        <h1 className="mb-3 text-2xl font-bold text-[var(--kw-text)]">
          {title ?? t('forbiddenState.title')}
        </h1>

        {/* 描述 */}
        <p className="mb-6 text-[var(--kw-text-muted)]">
          {resourceName
            ? t('forbiddenState.noPermissionWithResource').replace('{resource}', resourceName)
            : t('forbiddenState.noPermission')}
        </p>

        {/* 角色对比 */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="rounded-full bg-[var(--kw-primary-100)] px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)]">
            {t('forbiddenState.currentRole')}:{' '}
            {role ? ROLE_LABELS[role] : t('forbiddenState.notLoggedIn')}
          </div>
          <span className="text-[var(--kw-text-muted)]">→</span>
          <div className="dark:bg-[var(--kw-dark-purple-surface)]/30 rounded-full bg-[var(--kw-purple-surface)] px-4 py-2 text-sm font-medium text-[var(--kw-purple-text)] dark:text-[var(--kw-dark-primary)]">
            {t('forbiddenState.requiredRole')}: {ROLE_LABELS[requiredRole]}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            variant="kawaii"
            onClick={() => router.push('/')}
            leftIcon={<Home className="h-4 w-4" />}
          >
            {t('common.backToHome')}
          </Button>
          {showBackButton && (
            <Button
              variant="outline"
              onClick={() => router.back()}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              {t('common.back')}
            </Button>
          )}
        </div>

        {/* 帮助链接 */}
        <p className="mt-6 text-xs text-[var(--kw-text-muted)]">
          {t('forbiddenState.contactAdmin')}
        </p>
      </Card>
    </div>
  );
}
