/**
 * 重构后的 Layout 组件
 * 
 * 改进点:
 * 1. 通过 hooks 获取数据，不直接依赖 Runtime
 * 2. 更好的错误处理
 * 3. 更清晰的加载状态
 * 4. 支持测试注入
 */

'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from '@/components/mobile-nav';
import { useIdentities } from '@/hooks/use-identity';
import { ErrorBoundary } from '@/components/error-boundary';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui-primitives/button';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 重构后的 Layout 组件
 * 
 * 之前的问题:
 * - 直接调用 getRuntime() 和 initializeRuntime()
 * - 直接操作 registry
 * - 难以测试
 * 
 * 现在的改进:
 * - 使用 useIdentities hook
 * - 清晰的加载/错误状态
 * - 更好的用户体验
 */
export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    currentIdentity, 
    onlineIdentities, 
    isLoading, 
    error,
    refresh 
  } = useIdentities();

  // 加载状态
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 错误状态
  if (error) {
    return <ErrorScreen error={error} onRetry={refresh} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 lg:ml-0 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        <Header 
          currentIdentity={currentIdentity} 
          onlineIdentities={onlineIdentities} 
          onCreateClick={() => {}}
        />
        
        <main className="p-4 md:p-6 pb-24 lg:pb-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

/**
 * 统一的加载界面
 * 
 * 之前散落在各处的加载 UI 现在统一在这里
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#1A1A2E] dark:to-[#252540]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <p className="text-gray-500 dark:text-[#9CA3AF]">
          Initializing Dual Cosmos...
        </p>
      </div>
    </div>
  );
}

/**
 * 错误界面
 * 
 * 提供重试机制，提升用户体验
 */
function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#1A1A2E] dark:to-[#252540] p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#252540] rounded-3xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
          Failed to initialize
        </h1>
        
        <p className="text-gray-600 dark:text-[#9CA3AF] mb-6">
          {error.message || 'Something went wrong while loading the application.'}
        </p>

        <Button onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
}

/**
 * 简化版的 Layout，用于测试/Storybook
 * 
 * 不依赖 Runtime，接受 props 注入数据
 */
export interface SimpleLayoutProps {
  children: React.ReactNode;
  currentIdentity?: Identity | null;
  onlineIdentities?: Identity[];
  isLoading?: boolean;
}

export function SimpleLayout({ 
  children, 
  currentIdentity = null, 
  onlineIdentities = [],
  isLoading = false 
}: SimpleLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540]">
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className={`transition-all duration-300 lg:ml-0 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        <Header 
          currentIdentity={currentIdentity} 
          onlineIdentities={onlineIdentities} 
          onCreateClick={() => {}}
        />
        
        <main className="p-4 md:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}

// 类型导入
import type { Identity } from '@/shared/types';
