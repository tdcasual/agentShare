/**
 * Route Policy - 路由访问策略
 *
 * 定义每个路由的：
 * - 认证要求（是否需要登录）
 * - 数据源（backend/demo/local）
 * - 未授权行为（redirect/block/allow_readonly）
 *
 * 注意：角色权限检查由 role-system.ts 负责
 * 两者关系：
 * - route-policy.ts: 控制"是否可访问"（认证层）
 * - role-system.ts: 控制"谁可访问"（权限层）
 *
 * 完整访问控制流程：
 * 1. RouteGuard 检查 route-policy（是否需认证）
 * 2. 通过后，检查 role-system（角色是否足够）
 * 3. 两者都通过才允许访问
 */

import type { SessionState } from './session-state';
import { ROUTE_ROLES } from './role-system';

export type RouteMode =
  | 'bootstrap'
  | 'auth'
  | 'transition'
  | 'authenticated'
  | 'public'
  | 'demo'
  | 'unavailable';

export type DataSource =
  | 'backend'
  | 'local'
  | 'demo'
  | 'none';

export interface RoutePolicy {
  path: string;
  mode: RouteMode;
  requiredSession: SessionState | null;
  dataSource: DataSource;
  unauthorizedBehavior: 'redirect' | 'block' | 'allow_readonly';
  redirectTo?: string;
}

export const ROUTE_POLICIES: RoutePolicy[] = [
  {
    path: '/setup',
    mode: 'bootstrap',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },

  {
    path: '/login',
    mode: 'auth',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
  },
  {
    path: '/logout',
    mode: 'transition',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'allow_readonly',
  },

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
  {
    path: '/approvals',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/playbooks',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/runs',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
  {
    path: '/docs',
    mode: 'public',
    requiredSession: null,
    dataSource: 'backend',
    unauthorizedBehavior: 'allow_readonly',
  },

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

  {
    path: '/marketplace',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },

  {
    path: '/',
    mode: 'authenticated',
    requiredSession: 'authenticated',
    dataSource: 'backend',
    unauthorizedBehavior: 'redirect',
    redirectTo: '/login',
  },
];

/**
 * 获取路由策略
 */
export function getRoutePolicy(path: string): RoutePolicy | undefined {

  const exact = ROUTE_POLICIES.find((p) => p.path === path);
  if (exact) {
    return exact;
  }


  return ROUTE_POLICIES.find((p) => path.startsWith(p.path + '/'));
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

    return { allowed: true };
  }

  if (policy.mode === 'bootstrap') {
    if (sessionState === 'authenticated') {
      return { allowed: false, redirect: '/login', reason: '引导已完成' };
    }
    return { allowed: true };
  }

  if (policy.mode === 'auth') {
    if (sessionState === 'authenticated') {
      return { allowed: false, reason: '已认证' };
    }
    return { allowed: true };
  }

  if (policy.mode === 'transition') {
    return { allowed: true };
  }

  if (policy.mode === 'public') {
    return { allowed: true };
  }

 
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


  if (policy.mode === 'demo') {
    return { allowed: true };
  }


  if (policy.mode === 'unavailable') {
    return { allowed: false, reason: '路由尚未实现' };
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

/**
 * 验证路由配置一致性
 *
 * 检查 route-policy.ts 和 role-system.ts 中定义的路由是否同步
 * 用于开发时检测配置漂移
 *
 * @returns 配置不一致的路由列表
 */
export function validateRouteConsistency(): Array<{
  path: string;
  issue: string;
}> {
  const issues: Array<{ path: string; issue: string }> = [];


  for (const path of Object.keys(ROUTE_ROLES)) {
    const policy = getRoutePolicy(path);
    if (!policy) {
      issues.push({
        path,
        issue: '在 role-system.ts 中定义但 route-policy.ts 中缺失',
      });
    } else if (policy.mode !== 'authenticated') {
      issues.push({
        path,
        issue: `在 role-system.ts 中定义但 route-policy.ts 中为 ${policy.mode} 模式（期望 authenticated）`,
      });
    }
  }


  for (const policy of ROUTE_POLICIES) {
    if (policy.mode === 'authenticated') {
      if (!ROUTE_ROLES[policy.path]) {



      }
    }
  }

  return issues;
}
