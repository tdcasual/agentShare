'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail, Sparkles, Loader2, Shield } from 'lucide-react';
import { login, type LoginInput } from '@/lib/vaultgate-api';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SimpleThemeToggle } from '@/components/theme-toggle';
import { useI18n } from '@/components/i18n-provider';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const input: LoginInput = { email: form.email, password: form.password };
      await login(input);
      router.push('/');
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError(t('auth.login.failed'));
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
      <div className="safe-area-inset-top fixed right-4 top-4 z-toast flex items-center gap-3">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card
        variant="default"
        className="relative z-10 w-full max-w-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
      >
        <div className="space-y-3 sm:space-y-5 lg:space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-purple-surface)] px-4 py-2 text-sm font-medium text-[var(--kw-purple-text)]">
              <Shield className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.1em] sm:text-sm sm:tracking-wider">
                VaultGate v1.0
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] sm:text-4xl">
              {t('auth.login.title')}
            </h1>
            <p className="mx-auto max-w-sm text-[var(--kw-text-muted)]">
              {t('auth.login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label={t('auth.login.email')}
              type="email"
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="your@email.com"
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
              required
            />
            <Input
              label={t('auth.login.password')}
              type="password"
              autoComplete="current-password"
              icon={<LockKeyhole className="h-4 w-4" />}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="••••••••••••"
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
              required
            />

            {/* Status message */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-[var(--kw-red-surface)] bg-[var(--kw-red-surface)] px-4 py-3 text-sm text-[var(--kw-red-text)]"
              >
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" loading={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.login.signingIn')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('auth.login.signIn')}
                </span>
              )}
            </Button>
          </form>

          {/* Footer info */}
          <div className="text-center text-xs text-[var(--kw-text-muted)]">
            <p>{t('auth.login.pageTitle')}</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
