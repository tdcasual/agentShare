'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { LockKeyhole, Mail, Sparkles, Heart } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
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
      await api.login(form);
      router.push('/tokens');
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <span aria-hidden="true" className="absolute left-[10%] top-20 animate-float text-4xl opacity-10 dark:opacity-5">
          🌸
        </span>
        <span aria-hidden="true"
          className="absolute right-[15%] top-40 animate-float text-3xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '1s' }}
        >
          ✨
        </span>
        <span aria-hidden="true"
          className="absolute bottom-32 left-[20%] animate-float text-5xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '2s' }}
        >
          💕
        </span>
        <span aria-hidden="true"
          className="absolute left-[70%] top-60 animate-float text-3xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '0.5s' }}
        >
          🌟
        </span>
        <span aria-hidden="true"
          className="absolute bottom-20 right-[25%] animate-float text-4xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '1.5s' }}
        >
          🎀
        </span>
      </div>

      {/* Header controls */}
      <div className="fixed right-4 top-4 z-toast flex items-center gap-3">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card
        variant="kawaii"
        className="relative z-10 w-full max-w-xl dark:border-[var(--kw-dark-border)] dark:bg-gradient-to-br dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
      >
        {/* Decorative elements */}
        <div
          className="absolute -right-3 -top-3 animate-float text-2xl"
          style={{ animationDuration: '2s' }}
        >
          🌸
        </div>
        <div className="absolute -bottom-2 -left-2 text-xl opacity-50">✨</div>

        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-primary-100)] px-4 py-2 text-sm font-medium text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
              <Heart className="h-4 w-4" />
              <span className="uppercase tracking-wider">{t('auth.login.subtitle')}</span>
            </div>
            <h1 className="text-4xl font-bold text-[var(--kw-text)]">{t('auth.login.title')}</h1>
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
              className="bg-[var(--kw-primary-50)]/50 dark:bg-[var(--kw-dark-bg)]/50 rounded-2xl border border-[var(--kw-border)] px-4 py-3 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]"
            >
              {error ? (
                <span className="text-[var(--kw-error)] dark:text-[var(--kw-error)]">{error}</span>
              ) : checking ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {t('auth.login.checking')}
                </span>
              ) : (
                <span>🎀 {t('auth.login.description')}</span>
              )}
            </div>

            <Button className="w-full" type="submit" loading={isSubmitting} shimmer>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🌸</span>
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

          {/* Footer decoration */}
          <div className="flex justify-center gap-2 text-2xl opacity-30 dark:opacity-20">
            <span className="animate-float" style={{ animationDelay: '0s' }}>
              🌸
            </span>
            <span className="animate-float" style={{ animationDelay: '0.2s' }}>
              ✨
            </span>
            <span className="animate-float" style={{ animationDelay: '0.4s' }}>
              💕
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
