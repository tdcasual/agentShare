/**
 * Role Store - 角色状态管理
 *
 * VaultGate 使用单一 admin 角色。此 store 保留为兼容性 shim。
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
  isAdmin: () => boolean;
}

export const useRoleStore = create<RoleState>()((set, get) => ({
  role: null,

  setRole: (role) => set({ role }),

  clearRole: () => set({ role: null }),

  hasRole: (required) => {
    const { role } = get();
    return hasRequiredRole(role, required);
  },

  isAdmin: () => {
    const { role } = get();
    return role === 'admin';
  },
}));
