/**
 * useRole Hook - 角色管理Hook
 *
 * 从session同步角色状态到全局store
 * 提供便捷的角色检查方法
 */

'use client';

import { useEffect } from 'react';
import { useManagementSessionGate } from '@/lib/session';
import { useRoleStore } from '@/store/role-store';
import { hasRequiredRole, type ManagementRole } from '@/lib/role-system';

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
  /** 刷新session */
  refresh: () => void;
}

export function useRole(): UseRoleReturn {
  const {
    session,
    loading: isLoading,
    refreshSession,
  } = useManagementSessionGate({
    redirectOnMissingSession: false,
  });

  const {
    role: storedRole,
    setRole,
    clearRole,
  } = useRoleStore();

  // 同步session中的role到store
  useEffect(() => {
    if (session?.role && session.role !== storedRole) {
      const roleStr = session.role;
      if (
        roleStr === 'viewer' ||
        roleStr === 'operator' ||
        roleStr === 'admin' ||
        roleStr === 'owner'
      ) {
        setRole(roleStr);
      }
    }
  }, [session?.role, storedRole, setRole]);

  useEffect(() => {
    if (!isLoading && !session?.role && storedRole) {
      clearRole();
    }
  }, [clearRole, isLoading, session?.role, storedRole]);

  // 会话加载期间不暴露持久化角色，避免短暂渲染上一个账号的导航权限。
  const role = isLoading ? null : ((session?.role as ManagementRole | undefined) ?? storedRole ?? null);
  const hasRole = (required: ManagementRole) => !isLoading && hasRequiredRole(role, required);

  return {
    role: role as ManagementRole | null,
    isLoading,
    isViewer: hasRole('viewer'),
    isOperator: hasRole('operator'),
    isAdmin: hasRole('admin'),
    isOwner: hasRole('owner'),
    hasRole,
    refresh: refreshSession,
  };
}

/**
 * 简化版useRole（不自动同步session，仅从store读取）
 * 用于非认证敏感场景
 */
export function useRoleFromStore(): Omit<UseRoleReturn, 'isLoading' | 'refresh'> {
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
