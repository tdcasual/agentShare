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
import { PageLoader } from '@/components/ui/page-loader';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { AppNavigation } from '@/components/app-navigation';

interface RouteGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = new Set(['/login', '/setup', '/logout', '/docs']);
const STATE_FREE_PATHS = new Set(['/logout', '/docs']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/docs/');
}

function isStateFreePath(pathname: string): boolean {
  return STATE_FREE_PATHS.has(pathname) || pathname.startsWith('/docs/');
}

/**
 * 全局路由守卫
 * 处理引导和认证检查
 */
type ResolvedEntryState = Awaited<ReturnType<typeof resolveAppEntryState>>;

export function RouteGuard({ children }: RouteGuardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  // 入口状态与解析时的 pathname 绑定保存：pathname 变化后旧状态立即失效，
  // 跳转 effect 不会拿着过期的 entryState 做出错误重定向。
  const [entry, setEntry] = useState<{ pathname: string; state: ResolvedEntryState } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isStateFreePath(pathname)) {
      setEntry(null);
      return;
    }
    let stale = false;

    async function load() {
      try {
        const nextState = await resolveAppEntryState();
        if (!stale) {
          setEntry({ pathname, state: nextState });
        }
      } catch {
        if (!stale) {
          setEntry({
            pathname,
            state: {
              kind: 'unavailable',
              error: t('common.entryStateLoadFailed'),
            },
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

  // entryState 仅用于跳转决策：只有属于当前 pathname 的解析结果才能触发重定向，
  // 避免导航瞬间拿上一路径的过期状态执行 router.replace（登录弹跳根因）。
  const entryState = entry && entry.pathname === pathname ? entry.state : null;
  // latestState 用于渲染决策：上一路径解析出的已认证状态在静默重校验期间仍然有效。
  const latestState = entry?.state ?? null;

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

  // Public documentation must remain available when the management API is offline.
  if (isStateFreePath(pathname)) {
    return <>{children}</>;
  }

  const loader = (
    <main id="main-content">
      <PageLoader fullScreen message={t('common.initializing')} />
    </main>
  );

  // 初始加载（或 SSR 首帧）：从未解析出任何状态时统一渲染全屏加载。
  if (!mounted || latestState === null) {
    return loader;
  }

  // 已认证（包括上一路径解析出的状态）：受保护页直接渲染，后台静默重校验，
  // 不再闪全屏 loader；登录/设置页即将被跳走，保持 loader 避免闪出表单。
  if (latestState.kind === 'authenticated') {
    if (pathname === '/login' || pathname === '/setup') {
      return loader;
    }
    return (
      <>
        <AppNavigation />
        {children}
      </>
    );
  }

  // 非已认证：等当前路径的解析结果，匿名访问受保护路径不闪出受保护内容。
  if (entryState === null) {
    return loader;
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

  // setup_required / anonymous：跳转 effect 即将导航到 /setup 或 /login，等待期间保持 loader。
  if (
    (entryState.kind === 'setup_required' && pathname !== '/setup') ||
    (entryState.kind === 'anonymous' && !isPublicPath(pathname))
  ) {
    return loader;
  }

  // anonymous 在公开页（/login）、setup_required 在 /setup → 渲染公开表单
  return <>{children}</>;
}
