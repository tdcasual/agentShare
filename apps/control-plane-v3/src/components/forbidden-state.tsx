/**
 * Forbidden State - 403禁止访问状态
 *
 * 显示当前角色和所需角色的对比
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useI18n } from '@/components/i18n-provider';
import { useGlobalSession } from '@/lib/session-state';
import { getDefaultManagementRoute, type ManagementRole } from '@/lib/role-system';
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

function getRoleLabel(t: (key: string) => string, role: ManagementRole) {
  return t(`settings.roles.${role}`);
}

export function ForbiddenState({
  requiredRole,
  resourceName,
  showBackButton = true,
  title,
}: ForbiddenStateProps) {
  const router = useRouter();
  const { t } = useI18n();
  const session = useGlobalSession();
  const homeTarget = getDefaultManagementRoute(session.role);

  if (session.state === 'unknown') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-border" />
          <div className="h-4 w-32 rounded bg-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card
        className="w-full max-w-md animate-scale-in text-center"
        role="alert"
        aria-live="polite"
      >
        {/* 图标 */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-10 w-10 text-primary" />
        </div>

        {/* 标题 */}
        <h1 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">
          {title ?? t('forbiddenState.title')}
        </h1>

        {/* 描述 */}
        <p className="mb-6 text-muted-foreground">
          {resourceName
            ? t('forbiddenState.noPermissionWithResource').replace('{resource}', resourceName)
            : t('forbiddenState.noPermission')}
        </p>

        {/* 角色对比 */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
            {t('forbiddenState.currentRole')}:{' '}
            {session.role ? getRoleLabel(t, session.role) : t('forbiddenState.notLoggedIn')}
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
            {t('forbiddenState.requiredRole')}: {getRoleLabel(t, requiredRole)}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            variant="primary"
            onClick={() => router.push(homeTarget)}
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
        <p className="mt-6 text-xs text-muted-foreground">{t('forbiddenState.contactAdmin')}</p>
      </Card>
    </div>
  );
}
