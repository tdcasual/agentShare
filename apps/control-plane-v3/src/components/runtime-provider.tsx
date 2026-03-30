'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { 
  createCoreRuntime, 
  initializeRuntime, 
  RuntimeContext 
} from '@/core/runtime';
import { IdentityDomainPlugin } from '@/domains/identity/plugin';
import { Loader2 } from 'lucide-react';

interface RuntimeProviderProps {
  children: React.ReactNode;
}

/**
 * Runtime Provider
 * 
 * 负责：
 * 1. 创建 CoreRuntime 实例
 * 2. 注册 Domain 插件（不再硬编码在 Core 中）
 * 3. 初始化插件
 * 4. 通过 Context 提供 Runtime
 */
export function RuntimeProvider({ children }: RuntimeProviderProps) {
  const [runtime, setRuntime] = useState<ReturnType<typeof createCoreRuntime> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 1. 创建 Runtime，传入插件（解决反向依赖问题！）
        const rt = createCoreRuntime({
          plugins: [new IdentityDomainPlugin()],
        });

        // 2. 初始化插件
        await initializeRuntime(rt);

        if (mounted) {
          setRuntime(rt);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize runtime'));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // 加载状态
  if (!isReady || !runtime) {
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

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#1A1A2E] dark:to-[#252540] p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#252540] rounded-3xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] p-8 text-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Initialization Failed
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  // 提供 Runtime Context
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
    </RuntimeContext.Provider>
  );
}
