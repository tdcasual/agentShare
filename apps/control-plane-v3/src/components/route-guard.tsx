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
import { getRequiredRoleForPath, hasRequiredRole, type ManagementRole, isValidRole } from '@/lib/role-system';
import { ForbiddenState } from './forbidden-state';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * 全局路由守卫
 * 处理引导、认证、角色权限三层检查
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [entryState, setEntryState] = useState<Awaited<ReturnType<typeof resolveAppEntryState>> | null>(null);
  const [roleCheckFailed, setRoleCheckFailed] = useState<{ requiredRole: ManagementRole } | null>(null);

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
            error: 'Failed to resolve app entry state',
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 根据入口状态和当前路径决定行为
  useEffect(() => {
    if (!entryState) {return;}

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

    // 检查路由访问权限（基础认证）
    const allowed = isRouteAllowed(pathname, sessionState);
    
    if (!allowed.allowed && allowed.redirect) {
      router.replace(allowed.redirect);
      return;
    }
    
    // 认证就绪后的默认重定向
    if (entryState.kind === 'authenticated_ready' && pathname === '/login') {
      router.replace('/');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
          <p className="text-gray-500 dark:text-[#9CA3AF]">
            Initializing Control Plane...
          </p>
        </div>
      </div>
    );
  }
  
  // 服务不可用状态
  if (entryState.kind === 'unavailable') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540] p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#252540] rounded-3xl shadow-xl border border-red-100 dark:border-red-900/30 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Service Unavailable
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF] mb-6">
            Unable to connect to the backend service. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white font-medium hover:shadow-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // 角色权限不足 - 显示403页面
  if (roleCheckFailed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540]">
        <ForbiddenState 
          requiredRole={roleCheckFailed.requiredRole}
          resourceName={pathname}
        />
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-6 py-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!session && redirectOnMissingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }
  
  return <>{children}</>;
}
