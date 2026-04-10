'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { createCoreRuntime, initializeRuntime, RuntimeContext } from '@/core/runtime';
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--kw-primary-500)]" />
          <p className="text-[var(--kw-text-muted)]">Initializing Dual Cosmos...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
        <div className="w-full max-w-md rounded-3xl border border-[var(--kw-border)] bg-white p-8 text-center shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          <h1 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
            Initialization Failed
          </h1>
          <p className="text-[var(--kw-text-muted)]">{error.message}</p>
        </div>
      </div>
    );
  }

  // 提供 Runtime Context
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
