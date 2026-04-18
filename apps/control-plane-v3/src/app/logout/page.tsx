'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/session-state';
import { useI18n } from '@/components/i18n-provider';

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
          router.replace('/login');
        }
      } catch (logoutError) {
        if (!cancelled) {
          setError(logoutError instanceof Error ? logoutError.message : t('auth.logout.failed'));
        }
      }
    }

    void performLogout();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (error) {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center px-6">
        <div role="alert" aria-live="assertive" className="max-w-md text-center">
          <p>{error}</p>
          <button type="button" onClick={() => router.replace('/login')}>
            {t('auth.logout.continueToLogin')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-6">
      <p>{t('auth.logout.signingOut')}</p>
    </main>
  );
}
