/**
 * Role System - 角色系统
 *
 * 定义四级角色权限模型：viewer < operator < admin < owner
 */

export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';

export const ROLE_LEVELS: Record<ManagementRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

export const ROLE_LABELS: Record<ManagementRole, string> = {
  viewer: '观察者',
  operator: '操作员',
  admin: '管理员',
  owner: '所有者',
};

/**
 * 检查用户角色是否满足要求
 */
export function hasRequiredRole(
  userRole: ManagementRole | null | undefined,
  requiredRole: ManagementRole
): boolean {
  if (!userRole) {
    return false;
  }
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

/**
 * 获取角色等级
 */
export function getRoleLevel(role: ManagementRole): number {
  return ROLE_LEVELS[role];
}

/**
 * 比较两个角色等级
 * @returns 正数表示userRole更高，负数表示requiredRole更高，0相等
 */
export function compareRoles(userRole: ManagementRole, requiredRole: ManagementRole): number {
  return ROLE_LEVELS[userRole] - ROLE_LEVELS[requiredRole];
}

/**
 * 路由角色映射
 * 定义每个路由所需的最低角色
 *
 * 与后端 API 权限对齐：
 * - /api/events, /api/admin-accounts, /api/openclaw/agents, /api/access-tokens => admin
 * - /api/playbooks, /api/runs => any management session
 * - /api/tasks => public (GET), operator+ (POST)
 * - /api/reviews, /api/approvals => operator
 */
export const ROUTE_ROLES: Record<string, ManagementRole> = {
  // admin级别（基础查看依赖 admin-only API）
  '/': 'admin',
  '/inbox': 'admin',

  // admin级别（当前 tasks 页面仍依赖 admin-only APIs）
  '/tasks': 'admin',
  '/reviews': 'operator',
  '/approvals': 'operator',
  '/marketplace': 'operator',

  // viewer级别（后端只要求任意 management session）
  '/playbooks': 'viewer',
  '/runs': 'viewer',
  '/spaces': 'viewer',

  // admin级别（管理配置）
  '/identities': 'admin',
  '/tokens': 'admin',
  '/assets': 'admin',
  '/settings': 'admin',
};

const DEFAULT_MANAGEMENT_ROUTE_PRIORITY = ['/', '/reviews', '/playbooks', '/runs', '/spaces'] as const;

/**
 * 获取路由所需角色
 */
export function getRequiredRoleForPath(path: string): ManagementRole | null {
  // 精确匹配
  if (ROUTE_ROLES[path]) {
    return ROUTE_ROLES[path];
  }

  // 动态路由匹配（如 /playbooks/[id]）
  for (const [route, role] of Object.entries(ROUTE_ROLES)) {
    if (path.startsWith(route + '/')) {
      return role;
    }
  }

  return null;
}

export function getDefaultManagementRoute(role: ManagementRole | null | undefined): string {
  for (const path of DEFAULT_MANAGEMENT_ROUTE_PRIORITY) {
    const requiredRole = getRequiredRoleForPath(path);
    if (!requiredRole || hasRequiredRole(role, requiredRole)) {
      return path;
    }
  }

  return '/';
}

/**
 * 验证角色字符串是否有效
 */
export function isValidRole(role: string): role is ManagementRole {
  return ['viewer', 'operator', 'admin', 'owner'].includes(role);
}
