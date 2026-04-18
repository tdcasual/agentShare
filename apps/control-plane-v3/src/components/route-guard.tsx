/**
 * Route Guard - 路由守卫
 *
 * 强制执行路由访问策略
 * 支持四级角色权限检查：viewer < operator < admin < owner
 * 统一的入口状态解析和重定向
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isRouteAllowed } from '@/lib/route-policy';
import { resolveAppEntryState, useManagementSessionGate } from '@/lib/session';
import {
  getDefaultManagementRoute,
  getRequiredRoleForPath,
  hasRequiredRole,
  type ManagementRole,
  isValidRole,
} from '@/lib/role-system';
import { ForbiddenState } from './forbidden-state';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * 全局路由守卫
 * 处理引导、认证、角色权限三层检查
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [entryState, setEntryState] = useState<Awaited<
    ReturnType<typeof resolveAppEntryState>
  > | null>(null);
  const [roleCheckFailed, setRoleCheckFailed] = useState<{ requiredRole: ManagementRole } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextState = await resolveAppEntryState();
        if (!cancelled) {
          setEntryState(nextState);
        }
      } catch {
        if (!cancelled) {
          setEntryState({
            kind: 'unavailable',
            error: t('common.entryStateLoadFailed'),
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, t]);

  // 根据入口状态和当前路径决定行为
  useEffect(() => {
    if (!entryState) {
      return;
    }

    // 引导状态特殊处理
    if (entryState.kind === 'bootstrap_required') {
      if (pathname !== '/setup') {
        router.replace('/setup');
      }
      return;
    }

    // 服务不可用
    if (entryState.kind === 'unavailable') {
      setRoleCheckFailed(null);
      return;
    }

    const sessionState = entryState.kind === 'authenticated_ready' ? 'authenticated' : 'anonymous';

    // 认证就绪后的默认重定向
    if (entryState.kind === 'authenticated_ready' && pathname === '/login') {
      const userRole = isValidRole(entryState.session.role) ? entryState.session.role : null;
      router.replace(getDefaultManagementRoute(userRole));
      return;
    }

    // 检查路由访问权限（基础认证）
    const allowed = isRouteAllowed(pathname, sessionState);

    if (!allowed.allowed && allowed.redirect) {
      router.replace(allowed.redirect);
      return;
    }

    // 角色权限检查（仅认证后）
    if (entryState.kind === 'authenticated_ready') {
      const requiredRole = getRequiredRoleForPath(pathname);
      const userRoleStr = entryState.session.role;
      const userRole = isValidRole(userRoleStr) ? userRoleStr : null;

      if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
        setRoleCheckFailed({ requiredRole });
        return;
      }
    }

    // 通过所有检查
    setRoleCheckFailed(null);
  }, [entryState, pathname, router]);

  // 加载状态
  if (!entryState) {
    return (
      <div className="from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 flex min-h-screen items-center justify-center bg-gradient-to-br dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--kw-primary-500)]" />
          <p className="text-[var(--kw-text-muted)]">{t('common.initializing')}</p>
        </div>
      </div>
    );
  }

  // 服务不可用状态
  if (entryState.kind === 'unavailable') {
    return (
      <div className="from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 flex min-h-screen items-center justify-center bg-gradient-to-br p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
        <div className="dark:border-[var(--kw-dark-error-surface)]/30 w-full max-w-md rounded-3xl border border-[var(--kw-rose-surface)] bg-white p-8 text-center shadow-xl dark:bg-[var(--kw-dark-surface)]">
          <div className="dark:bg-[var(--kw-dark-error-surface)]/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
            {t('common.serviceUnavailable')}
          </h1>
          <p className="mb-6 text-[var(--kw-text-muted)]">
            {t('common.serviceUnavailableDescription')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-600)] px-6 py-3 font-medium text-white transition-shadow hover:shadow-lg"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // 角色权限不足 - 显示403页面
  if (roleCheckFailed) {
    return (
      <div className="from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 min-h-screen bg-gradient-to-br dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
        <ForbiddenState requiredRole={roleCheckFailed.requiredRole} resourceName={pathname} />
      </div>
    );
  }

  // 正常渲染子内容
  return <>{children}</>;
}

/**
 * 管理路由守卫 - 仅允许认证用户访问
 */
export function ManagementRouteGuard({
  children,
  redirectOnMissingSession = true,
}: {
  children: React.ReactNode;
  redirectOnMissingSession?: boolean;
}) {
  const { session, loading, error } = useManagementSessionGate({
    redirectOnMissingSession,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--kw-primary-500)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-[var(--kw-rose-surface)]/80 rounded-2xl border border-[var(--kw-rose-surface)] px-6 py-4 text-[var(--kw-rose-text)]">
          {error}
        </div>
      </div>
    );
  }

  if (!session && redirectOnMissingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--kw-primary-500)]" />
      </div>
    );
  }

  return <>{children}</>;
}
