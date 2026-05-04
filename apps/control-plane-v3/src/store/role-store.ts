/**
 * Role Store - 角色状态管理
 *
 * 使用 Zustand 管理全局角色状态
 * 不持久化到 localStorage，避免登出/切换账号时出现 stale role flash
 */

import { create } from 'zustand';
import type { ManagementRole } from '@/lib/role-system';
import { hasRequiredRole } from '@/lib/role-system';

interface RoleState {
  /** 当前用户角色 */
  role: ManagementRole | null;

  // Actions
  setRole: (role: ManagementRole) => void;
  clearRole: () => void;

  // Queries
  hasRole: (required: ManagementRole) => boolean;
  isViewer: () => boolean;
  isOperator: () => boolean;
  isAdmin: () => boolean;
  isOwner: () => boolean;
}

export const useRoleStore = create<RoleState>()((set, get) => ({
  role: null,

  setRole: (role) => set({ role }),

  clearRole: () => set({ role: null }),

  hasRole: (required) => {
    const { role } = get();
    return hasRequiredRole(role, required);
  },

  isViewer: () => {
    const { role } = get();
    return role === 'viewer' || role === 'operator' || role === 'admin' || role === 'owner';
  },

  isOperator: () => {
    const { role } = get();
    return ['operator', 'admin', 'owner'].includes(role ?? '');
  },

  isAdmin: () => {
    const { role } = get();
    return ['admin', 'owner'].includes(role ?? '');
  },

  isOwner: () => {
    const { role } = get();
    return role === 'owner';
  },
}));

// 非hook版本（用于非React上下文）
export function getCurrentRole(): ManagementRole | null {
  return useRoleStore.getState().role;
}

export function checkRole(required: ManagementRole): boolean {
  return useRoleStore.getState().hasRole(required);
}
