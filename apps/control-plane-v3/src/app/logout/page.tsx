'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, logout } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';

export default function LogoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function performLogout() {
      try {
        await logout();
        if (!cancelled) {
          window.location.href = '/login';
        }
      } catch (logoutError) {
        if (!cancelled) {
          // 会话已失效（401）即视为已登出，直接回登录页，不显示错误卡片
          if (logoutError instanceof ApiError && logoutError.status === 401) {
            router.replace('/login');
            return;
          }
          setError(logoutError instanceof Error ? logoutError.message : t('auth.logout.failed'));
        }
      }
    }

    void performLogout();

    return () => {
      cancelled = true;
    };
    // t 与 router 不需要作为依赖，注销只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-background p-4"
      >
        <Card className="w-full max-w-md p-8 text-center" role="alert" aria-live="assertive">
          <p className="mb-6 text-destructive">{error}</p>
          <Button
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            {t('auth.logout.continueToLogin')}
          </Button>
        </Card>
      </main>
    );
  }

  return <PageLoader fullScreen message={t('auth.logout.signingOut')} />;
}
