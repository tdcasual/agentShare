'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRoutePolicy, isRouteAllowed } from '@/lib/route-policy';
import { resolveAppEntryState } from '@/lib/session';
import { useGlobalSession } from '@/lib/session-state';
import {
  getDefaultManagementRoute,
  getRequiredRoleForPath,
  hasRequiredRole,
  type ManagementRole,
  isValidRole,
} from '@/lib/role-system';
import { ForbiddenState } from './forbidden-state';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [entryState, setEntryState] = useState<Awaited<
    ReturnType<typeof resolveAppEntryState>
  > | null>(null);
  const [roleCheckFailed, setRoleCheckFailed] = useState<{ requiredRole: ManagementRole } | null>(
    null
  );
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

  useEffect(() => {
    if (!entryState) {
      return;
    }

    const sessionState = entryState.kind === 'authenticated_ready' ? 'authenticated' : 'anonymous';
    const allowed = isRouteAllowed(pathname, sessionState);
    const routePolicy = getRoutePolicy(pathname);

    if (entryState.kind === 'bootstrap_required') {
      if (routePolicy?.mode === 'public') {
        setRoleCheckFailed(null);
        return;
      }
      if (pathname !== '/setup') {
        router.replace('/setup');
      }
      return;
    }

    if (entryState.kind === 'unavailable') {
      setRoleCheckFailed(null);
      return;
    }

    if (
      entryState.kind === 'authenticated_ready' &&
      (pathname === '/login' || pathname === '/setup')
    ) {
      const userRole = isValidRole(entryState.session.role) ? entryState.session.role : null;
      router.replace(getDefaultManagementRoute(userRole));
      return;
    }

    if (entryState.kind === 'login_required' && !allowed.allowed) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    if (!allowed.allowed && allowed.redirect) {
      router.replace(allowed.redirect);
      return;
    }

    if (entryState.kind === 'authenticated_ready') {
      const requiredRole = getRequiredRoleForPath(pathname);
      const userRoleStr = entryState.session.role;
      const userRole = isValidRole(userRoleStr) ? userRoleStr : null;

      if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
        setRoleCheckFailed({ requiredRole });
        return;
      }
    }

    setRoleCheckFailed(null);
  }, [entryState, pathname, router]);

  if (!mounted) {
    return <>{children}</>;
  }

  if (!entryState) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] dark:bg-[var(--kw-dark-bg)]"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--kw-primary-500)]" />
          <p className="text-[var(--kw-text)]">{t('common.initializing')}</p>
        </div>
      </main>
    );
  }

  if (entryState.kind === 'unavailable') {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] p-4 dark:bg-[var(--kw-dark-bg)]"
      >
        <div className="dark:border-[var(--kw-dark-error-surface)]/30 w-full max-w-md rounded-xl border border-[var(--kw-rose-surface)] bg-[var(--kw-surface)] p-8 text-center shadow-xl dark:bg-[var(--kw-dark-surface)]">
          <div className="dark:bg-[var(--kw-dark-error-surface)]/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
            <Loader2 className="h-8 w-8 text-[var(--kw-error)]" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
            {t('common.serviceUnavailable')}
          </h1>
          <p className="mb-6 text-[var(--kw-text-muted)]">
            {t('common.serviceUnavailableDescription')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[var(--kw-primary-500)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--kw-primary-600)]"
          >
            {t('common.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (roleCheckFailed) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-[var(--kw-bg)] dark:bg-[var(--kw-dark-bg)]"
      >
        <ForbiddenState requiredRole={roleCheckFailed.requiredRole} resourceName={pathname} />
      </main>
    );
  }

  return <>{children}</>;
}

export function ManagementRouteGuard({
  children,
}: {
  children: React.ReactNode;
  redirectOnMissingSession?: boolean;
}) {
  const globalSession = useGlobalSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  if (globalSession.state === 'unknown') {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--kw-primary-500)]" />
      </main>
    );
  }

  if (globalSession.state === 'unavailable') {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center">
        <div className="bg-[var(--kw-rose-surface)]/80 rounded-xl border border-[var(--kw-rose-surface)] px-6 py-4 text-[var(--kw-rose-text)]">
          {globalSession.error}
        </div>
      </main>
    );
  }

  if (globalSession.state !== 'authenticated') {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--kw-primary-500)]" />
      </main>
    );
  }

  return <>{children}</>;
}
