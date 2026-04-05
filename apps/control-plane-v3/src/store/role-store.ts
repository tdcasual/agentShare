/**
 * Role Store - 角色状态管理
 * 
 * 使用 Zustand 管理全局角色状态
 * 持久化存储到 localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ManagementRole } from '@/lib/role-system';
import { hasRequiredRole } from '@/lib/role-system';

interface RoleState {
  /** 当前用户角色 */
  role: ManagementRole | null;
  /** 角色最后更新时间 */
  lastUpdated: number | null;
  
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

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      role: null,
      lastUpdated: null,
      
      setRole: (role) => set({ 
        role, 
        lastUpdated: Date.now() 
      }),
      
      clearRole: () => set({ 
        role: null, 
        lastUpdated: null 
      }),
      
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
    }),
    {
      name: 'control-plane-role-storage',
      // 只持久化role字段
      partialize: (state) => ({ 
        role: state.role,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// 非hook版本（用于非React上下文）
export function getCurrentRole(): ManagementRole | null {
  return useRoleStore.getState().role;
}

export function checkRole(required: ManagementRole): boolean {
  return useRoleStore.getState().hasRole(required);
}
