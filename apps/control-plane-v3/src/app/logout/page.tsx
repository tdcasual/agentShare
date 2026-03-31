'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/session-state';

export default function LogoutPage() {
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
          setError(logoutError instanceof Error ? logoutError.message : 'Failed to sign out');
        }
      }
    }

    void performLogout();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div role="alert" aria-live="assertive" className="max-w-md text-center">
          <p>{error}</p>
          <button type="button" onClick={() => router.replace('/login')}>
            Continue to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p>Signing out...</p>
    </main>
  );
}
