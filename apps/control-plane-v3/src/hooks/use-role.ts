/**
 * useRole Hook - 角色管理Hook
 *
 * 从全局会话状态读取角色，不再独立触发API调用。
 * RouteGuard 已经解析了会话，这里只读取结果。
 */

'use client';

import { useEffect } from 'react';
import { useGlobalSession } from '@/lib/session-state';
import { useRoleStore } from '@/store/role-store';
import { hasRequiredRole, isValidRole, type ManagementRole } from '@/lib/role-system';

interface UseRoleReturn {
  /** 当前角色 */
  role: ManagementRole | null;
  /** 是否加载中 */
  isLoading: boolean;
  /** 是否viewer级别或以上 */
  isViewer: boolean;
  /** 是否operator级别或以上 */
  isOperator: boolean;
  /** 是否admin级别或以上 */
  isAdmin: boolean;
  /** 是否owner */
  isOwner: boolean;
  /** 检查是否满足角色要求 */
  hasRole: (required: ManagementRole) => boolean;
}

export function useRole(): UseRoleReturn {
  const session = useGlobalSession();
  const { role: storedRole, setRole, clearRole } = useRoleStore();

  const isLoading = session.state === 'unknown';
  const sessionRole =
    session.state === 'authenticated' && session.role && isValidRole(session.role)
      ? session.role
      : null;

  // 同步session中的role到store
  useEffect(() => {
    if (sessionRole && sessionRole !== storedRole) {
      setRole(sessionRole);
    }
  }, [sessionRole, storedRole, setRole]);

  useEffect(() => {
    if (!isLoading && !sessionRole && storedRole) {
      clearRole();
    }
  }, [clearRole, isLoading, sessionRole, storedRole]);

  // 会话加载期间不暴露持久化角色，避免短暂渲染上一个账号的导航权限。
  const role = isLoading ? null : (sessionRole ?? storedRole ?? null);
  const checkRole = (required: ManagementRole) => !isLoading && hasRequiredRole(role, required);

  return {
    role: role as ManagementRole | null,
    isLoading,
    isViewer: checkRole('viewer'),
    isOperator: checkRole('operator'),
    isAdmin: checkRole('admin'),
    isOwner: checkRole('owner'),
    hasRole: checkRole,
  };
}

/**
 * 简化版useRole（不自动同步session，仅从store读取）
 * 用于非认证敏感场景
 */
export function useRoleFromStore(): Omit<UseRoleReturn, 'isLoading'> {
  const { role, hasRole, isViewer, isOperator, isAdmin, isOwner } = useRoleStore();

  return {
    role,
    isViewer: isViewer(),
    isOperator: isOperator(),
    isAdmin: isAdmin(),
    isOwner: isOwner(),
    hasRole,
  };
}
