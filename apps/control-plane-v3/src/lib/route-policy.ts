/**
 * Route Policy - 路由访问策略
 * 
 * 定义每个路由的访问要求、数据源和未授权行为
 * 单一真实来源，强制执行访问控制
 */

import type { SessionState } from './session-state';

export type RouteMode = 
  | 'bootstrap'      // 引导路由
  | 'auth'           // 认证路由
  | 'transition'     // 认证过渡路由
  | 'authenticated'  // 认证管理路由
  | 'public'         // 公共信息路由
  | 'demo'           // 显式演示路由
  | 'unavailable';   // 未实现/不可用

export type DataSource = 
  | 'backend'        // 后端API
  | 'local'          // 本地运行时
  | 'demo'           // 演示夹具
  | 'none';          // 无数据源

export interface RoutePolicy {
  path: string;
  mode: RouteMode;
  requiredSession: SessionState | null;
  dataSource: DataSource;
  unauthorizedBehavior: 'redirect' | 'block' | 'allow_readonly';
  redirectTo?: string;
}

// 路由策略表 - 单一真实来源
export const ROUTE_POLICIES: RoutePolicy[] = [
  // Bootstrap
  {
    path: '/setup',
    mode: 'bootstrap',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  
  // Auth
  {
    path: '/login',
    mode: 'auth',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/',
  },
  {
    path: '/logout',
    mode: 'transition',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'allow_readonly',
  },
  
  // Authenticated Management Routes
  {
    path: '/tokens',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/assets',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/tasks',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/inbox',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/reviews',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/settings',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/identities',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/spaces',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  
  // Demo Routes (显式演示)
  {
    path: '/demo',
    mode: 'demo',
    requiredSession: null,
    dataSource: 'demo',
    unauthorizedBehavior: 'allow_readonly',
  },
  {
    path: '/demo/identities',
    mode: 'demo',
    requiredSession: null,
    dataSource: 'demo',
    unauthorizedBehavior: 'allow_readonly',
  },
  {
    path: '/demo/spaces',
    mode: 'demo',
    requiredSession: null,
    dataSource: 'demo',
    unauthorizedBehavior: 'allow_readonly',
  },
  
  // Unavailable
  {
    path: '/marketplace',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  
  // Entry (特殊处理)
  {
    path: '/',
    mode: 'public',
    requiredSession: null,
    dataSource: 'none',
    unauthorizedBehavior: 'allow_readonly',
  },
];

/**
 * 获取路由策略
 */
export function getRoutePolicy(path: string): RoutePolicy | undefined {
  // 精确匹配优先
  const exact = ROUTE_POLICIES.find(p => p.path === path);
  if (exact) return exact;
  
  // 前缀匹配
  return ROUTE_POLICIES.find(p => path.startsWith(p.path + '/'));
}

/**
 * 检查路由是否允许访问
 */
export function isRouteAllowed(
  path: string,
  sessionState: SessionState
): { allowed: boolean; redirect?: string; reason?: string } {
  const policy = getRoutePolicy(path);
  
  if (!policy) {
    // 未知路由，默认允许（404 会处理）
    return { allowed: true };
  }
  
  // 引导路由特殊处理
  if (policy.mode === 'bootstrap') {
    if (sessionState === 'authenticated') {
      return { allowed: false, redirect: '/login', reason: 'Bootstrap already complete' };
    }
    return { allowed: true };
  }
  
  // 认证路由特殊处理
  if (policy.mode === 'auth') {
    if (sessionState === 'authenticated') {
      return { allowed: false, redirect: '/', reason: 'Already authenticated' };
    }
    return { allowed: true };
  }

  if (policy.mode === 'transition') {
    return { allowed: true };
  }
  
  // 认证管理路由
  if (policy.mode === 'authenticated') {
    if (sessionState !== 'authenticated') {
      return {
        allowed: false,
        redirect: policy.redirectTo,
        reason: `Authentication required for ${path}`,
      };
    }
    return { allowed: true };
  }
  
  // 演示路由
  if (policy.mode === 'demo') {
    return { allowed: true };
  }
  
  // 不可用路由
  if (policy.mode === 'unavailable') {
    return { allowed: false, reason: 'Route not implemented' };
  }
  
  return { allowed: true };
}

/**
 * 判断是否为管理路由
 */
export function isManagementRoute(path: string): boolean {
  const policy = getRoutePolicy(path);
  return policy?.mode === 'authenticated';
}

/**
 * 判断是否为演示路由
 */
export function isDemoRoute(path: string): boolean {
  const policy = getRoutePolicy(path);
  return policy?.mode === 'demo';
}
