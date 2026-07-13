'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleThemeToggle } from '@/components/theme-toggle';
import { useI18n } from '@/components/i18n-provider';
import { apiFetch } from '@/lib/vaultgate-api';

interface BootstrapStatus {
  initialized: boolean;
}

interface BootstrapResponse {
  message: string;
  user_id: string;
  email: string;
}

export default function SetupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    let stale = false;

    async function checkStatus() {
      try {
        const status = await apiFetch<BootstrapStatus>('/bootstrap/status');
        if (!stale && status.initialized) {
          router.replace('/login');
        }
      } catch {
        // Ignore errors and allow the user to attempt setup
      } finally {
        if (!stale) {
          setIsChecking(false);
        }
      }
    }

    void checkStatus();
    return () => {
      stale = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError(t('setup.passwordMismatch'));
      setIsSubmitting(false);
      return;
    }

    try {
      await apiFetch<BootstrapResponse>('/bootstrap/init', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      router.push('/login');
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError(t('setup.failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <main
        id="main-content"
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12"
      >
        <p className="text-muted-foreground">{t('common.initializing')}</p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12"
    >
      {/* Header controls */}
      <div className="safe-area-inset-top fixed right-4 top-4 z-toast flex items-center gap-3">
        <SimpleThemeToggle />
      </div>

      <Card className="relative z-10 w-full max-w-xl">
        <div className="space-y-3 p-6 sm:space-y-5 sm:p-8 lg:space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{t('setup.title')}</h1>
            <p className="mx-auto max-w-sm text-muted-foreground">{t('setup.subtitle')}</p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="your@email.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <div className="relative">
                <LockKeyhole
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="••••••••••••"
                  className="pl-9"
                  required
                  minLength={12}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('setup.passwordHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('setup.confirmPassword')}</Label>
              <div className="relative">
                <LockKeyhole
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="••••••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Status message */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" loading={isSubmitting}>
              {t('setup.createAccount')}
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
