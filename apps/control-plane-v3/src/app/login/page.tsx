'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { LockKeyhole, Mail, Sparkles, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getDefaultManagementRoute } from '@/lib/role-system';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SimpleThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const t = useI18n().t;
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const bootstrap = await api.getBootstrapStatus();
        if (cancelled) {
          return;
        }

        if (!bootstrap.initialized) {
          router.replace('/setup');
          return;
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('auth.login.failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // t 不需要作为依赖，bootstrap 检查只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const session = await api.login(form);
      const target = getDefaultManagementRoute(session.role);
      window.location.href = target;
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(submitError instanceof Error ? submitError.message : t('auth.login.loginFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12"
    >
      {/* Header controls */}
      <div className="fixed right-4 top-4 z-toast flex items-center gap-3">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card
        variant="default"
        className="relative z-10 w-full max-w-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
      >
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-primary-50)] px-4 py-2 text-sm font-medium text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
              <LockKeyhole className="h-4 w-4" />
              <span className="uppercase tracking-wider">{t('auth.login.subtitle')}</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] sm:text-4xl">
              {t('auth.login.title')}
            </h1>
            <p className="mx-auto max-w-sm text-[var(--kw-text-muted)]">
              {t('auth.login.description')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label={t('auth.login.email')}
              type="email"
              icon={<Mail className="h-4 w-4" />}
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t('auth.login.emailPlaceholder')}
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />
            <Input
              label={t('auth.login.password')}
              type="password"
              icon={<LockKeyhole className="h-4 w-4" />}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="••••••••••••"
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />

            {/* Status message */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="dark:bg-[var(--kw-dark-bg)]/50 rounded-xl border border-[var(--kw-border)] bg-[var(--kw-surface-alt)] px-4 py-3 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]"
            >
              {error ? (
                <span className="text-[var(--kw-error)] dark:text-[var(--kw-error)]">{error}</span>
              ) : checking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.login.checking')}
                </span>
              ) : (
                <span>{t('auth.login.description')}</span>
              )}
            </div>

            <Button className="w-full" type="submit" loading={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.login.signIn')}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('auth.login.signIn')}
                </span>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
