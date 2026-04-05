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
import type { ManagementRole } from '@/lib/role-system';

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
  const { session, loading: isLoading, refreshSession } = useManagementSessionGate({
    redirectOnMissingSession: false,
  });
  
  const { 
    role: storedRole, 
    setRole, 
    hasRole: checkRole,
    isViewer: checkViewer,
    isOperator: checkOperator,
    isAdmin: checkAdmin,
    isOwner: checkOwner,
  } = useRoleStore();
  
  // 同步session中的role到store
  useEffect(() => {
    if (session?.role && session.role !== storedRole) {
      const roleStr = session.role;
      if (roleStr === 'viewer' || roleStr === 'operator' || roleStr === 'admin' || roleStr === 'owner') {
        setRole(roleStr);
      }
    }
  }, [session?.role, storedRole, setRole]);
  
  // 使用session中的role（优先）或store中的role
  const role = (session?.role as ManagementRole | undefined) ?? storedRole ?? null;
  
  return {
    role: role as ManagementRole | null,
    isLoading,
    isViewer: checkViewer(),
    isOperator: checkOperator(),
    isAdmin: checkAdmin(),
    isOwner: checkOwner(),
    hasRole: checkRole,
    refresh: refreshSession,
  };
}

/**
 * 简化版useRole（不自动同步session，仅从store读取）
 * 用于非认证敏感场景
 */
export function useRoleFromStore(): Omit<UseRoleReturn, 'isLoading' | 'refresh'> {
  const { 
    role, 
    hasRole,
    isViewer,
    isOperator,
    isAdmin,
    isOwner,
  } = useRoleStore();
  
  return {
    role,
    isViewer: isViewer(),
    isOperator: isOperator(),
    isAdmin: isAdmin(),
    isOwner: isOwner(),
    hasRole,
  };
}
