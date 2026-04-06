/**
 * Route Guard Wrapper - 路由守卫包装器
 *
 * 客户端组件，包装 RouteGuard
 * 用于在服务端 layout 中引入客户端权限检查
 */

'use client';

import { RouteGuard } from './route-guard';

interface RouteGuardWrapperProps {
  children: React.ReactNode;
}

export function RouteGuardWrapper({ children }: RouteGuardWrapperProps) {
  return <RouteGuard>{children}</RouteGuard>;
}
