/**
 * Forbidden State - 403禁止访问状态
 * 
 * Kawaii风格的403页面组件
 * 显示当前角色和所需角色的对比
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';

import { useRole } from '@/hooks/use-role';
import { ROLE_LABELS, type ManagementRole } from '@/lib/role-system';
import { Lock, ArrowLeft, Home } from 'lucide-react';

interface ForbiddenStateProps {
  /** 需要的角色 */
  requiredRole: ManagementRole;
  /** 资源名称（可选） */
  resourceName?: string;
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 自定义标题 */
  title?: string;
}

export function ForbiddenState({ 
  requiredRole, 
  resourceName,
  showBackButton = true,
  title = '访问受限'
}: ForbiddenStateProps) {
  const router = useRouter();
  const { role, isLoading } = useRole();
  
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-pink-200" />
          <div className="h-4 w-32 bg-pink-200 rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card 
        variant="kawaii" 
        decoration
        className="max-w-md w-full text-center animate-scale-in"
        role="alert"
        aria-live="polite"
      >
        {/* 图标 */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <Lock className="w-12 h-12 text-pink-500 animate-pulse" />
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          {title}
        </h1>
        
        {/* 描述 */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {resourceName 
            ? `您没有权限访问「${resourceName}」` 
            : '您没有权限访问此页面'}
        </p>
        
        {/* 角色对比 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <div className="px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-sm">
            当前: {role ? ROLE_LABELS[role] : '未登录'}
          </div>
          <span className="text-gray-400">→</span>
          <div className="px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
            需要: {ROLE_LABELS[requiredRole]}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="kawaii" 
            onClick={() => router.push('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            返回首页
          </Button>
          {showBackButton && (
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              返回上一页
            </Button>
          )}
        </div>
        
        {/* 帮助链接 */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          如需访问权限，请联系系统管理员
        </p>
      </Card>
    </div>
  );
}

/**
 * 页面级别的403包装组件
 * 自动根据路由判断是否需要显示403
 */
export function ForbiddenPageWrapper({ 
  children,
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole: ManagementRole;
}) {
  const { hasRole, isLoading } = useRole();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-pink-200" />
          <div className="h-4 w-32 bg-pink-200 rounded" />
        </div>
      </div>
    );
  }
  
  if (!hasRole(requiredRole)) {
    return <ForbiddenState requiredRole={requiredRole} />;
  }
  
  return <>{children}</>;
}
