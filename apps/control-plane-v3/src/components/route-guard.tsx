/**
 * Route Guard - 路由守卫
 *
 * 处理引导、认证两层检查。VaultGate 使用单一 admin 角色，
 * 所有受保护页面对任何已认证用户开放。
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { resolveAppEntryState } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface RouteGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = new Set(['/login', '/setup', '/logout', '/docs']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/docs/');
}

/**
 * 全局路由守卫
 * 处理引导和认证检查
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [entryState, setEntryState] = useState<Awaited<
    ReturnType<typeof resolveAppEntryState>
  > | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let stale = false;

    async function load() {
      try {
        const nextState = await resolveAppEntryState();
        if (!stale) {
          setEntryState(nextState);
        }
      } catch {
        if (!stale) {
          setEntryState({
            kind: 'unavailable',
            error: t('common.entryStateLoadFailed'),
          });
        }
      }
    }

    void load();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 根据入口状态和当前路径决定行为
  useEffect(() => {
    if (!entryState) {
      return;
    }

    const isPublic = isPublicPath(pathname);

    // 引导状态特殊处理
    if (entryState.kind === 'setup_required') {
      if (pathname !== '/setup' && !pathname.startsWith('/docs')) {
        router.replace('/setup');
      }
      return;
    }

    // 服务不可用
    if (entryState.kind === 'unavailable') {
      return;
    }

    // 已认证用户访问登录/设置页 — 重定向到管理首页
    if (entryState.kind === 'authenticated' && (pathname === '/login' || pathname === '/setup')) {
      router.replace('/');
      return;
    }

    // 未认证用户访问需要认证的页面 — 重定向到登录页
    if (entryState.kind === 'anonymous' && !isPublic) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }
  }, [entryState, pathname, router]);

  // 避免 hydration mismatch：SSR 和初始 hydrate 渲染 children
  if (!mounted) {
    return <>{children}</>;
  }

  // 加载状态
  if (!entryState) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-foreground">{t('common.initializing')}</p>
        </div>
      </main>
    );
  }

  // 服务不可用状态
  if (entryState.kind === 'unavailable') {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-background p-4"
      >
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-4 flex justify-center text-destructive" aria-hidden="true">
            <AlertTriangle className="h-10 w-10" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">
            {t('common.serviceUnavailable')}
          </h1>
          <p className="mb-6 text-muted-foreground">{t('common.serviceUnavailableDescription')}</p>
          <Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>
        </Card>
      </main>
    );
  }

  // 正常渲染子内容
  return <>{children}</>;
}
