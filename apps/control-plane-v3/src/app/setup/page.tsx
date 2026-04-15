'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import {
  ShieldCheck,
  UserRoundPlus,
  Sparkles,
  Star,
  Heart,
  LockKeyhole,
  Mail,
  User,
} from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SimpleThemeToggle } from '@/components/theme-toggle';

export default function SetupPage() {
  const t = useI18n().t;
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    bootstrap_key: '',
    email: '',
    display_name: '',
    password: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const status = await api.getBootstrapStatus();
        if (!cancelled && status.initialized) {
          router.replace('/login');
          return;
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('auth.setup.failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
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
      await api.setupOwner(form);
      router.push('/login');
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : t('auth.setup.failedToBootstrap')
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const steps = [
    { icon: '🎀', text: t('auth.setup.step1') },
    { icon: '✨', text: t('auth.setup.step2') },
    { icon: '🌸', text: t('auth.setup.step3') },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      {/* Floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <span
          aria-hidden="true"
          className="absolute left-[8%] top-16 animate-float text-4xl opacity-10 dark:opacity-5"
        >
          🌟
        </span>
        <span
          aria-hidden="true"
          className="absolute right-[12%] top-32 animate-float text-3xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '1s' }}
        >
          💫
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-40 left-[15%] animate-float text-5xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '2s' }}
        >
          🎀
        </span>
        <span
          aria-hidden="true"
          className="absolute right-[70%] top-48 animate-float text-3xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '0.5s' }}
        >
          🌸
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-24 right-[20%] animate-float text-4xl opacity-10 dark:opacity-5"
          style={{ animationDelay: '1.5s' }}
        >
          💕
        </span>
      </div>

      {/* Header controls */}
      <div className="fixed right-4 top-4 z-toast flex items-center gap-3">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card
        variant="feature"
        className="relative z-10 w-full max-w-3xl dark:border-[var(--kw-dark-border)] dark:bg-gradient-to-br dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
      >
        {/* Decorative elements */}
        <div
          className="absolute -right-4 -top-4 animate-float text-3xl"
          style={{ animationDuration: '3s' }}
          aria-hidden="true"
        >
          ✨
        </div>
        <div className="absolute -bottom-3 -left-3 text-2xl opacity-60" aria-hidden="true">
          🌸
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left side - Info */}
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-primary-100)] px-4 py-2 text-sm font-medium text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
                <ShieldCheck className="h-4 w-4" />
                <span className="uppercase tracking-wider">{t('auth.setup.subtitle')}</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight text-[var(--kw-text)] lg:text-4xl dark:text-[var(--kw-dark-text)]">
                  {t('auth.setup.title')}
                </h1>
                <p className="leading-relaxed text-[var(--kw-text-muted)]">
                  {t('auth.setup.description')}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="dark:bg-[var(--kw-dark-bg)]/80 space-y-4 rounded-3xl border border-[var(--kw-border)] bg-white/80 p-5 dark:border-[var(--kw-dark-border)]">
              <div className="flex items-center gap-3 text-[var(--kw-text)]">
                <UserRoundPlus className="h-5 w-5 text-[var(--kw-primary-500)]" />
                <span className="font-semibold">{t('auth.setup.whatNext')}</span>
              </div>
              <ul className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex animate-slide-up items-start gap-3 text-sm text-[var(--kw-text-muted)]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span>{step.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Decoration */}
            <div className="flex justify-center gap-3 text-3xl opacity-40 dark:opacity-20">
              <span className="animate-float" style={{ animationDelay: '0s' }}>
                🌸
              </span>
              <span className="animate-float" style={{ animationDelay: '0.3s' }}>
                ✨
              </span>
              <span className="animate-float" style={{ animationDelay: '0.6s' }}>
                💕
              </span>
            </div>
          </div>

          {/* Right side - Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t('auth.setup.bootstrapKey')}
              icon={<LockKeyhole className="h-4 w-4" />}
              value={form.bootstrap_key}
              onChange={(event) =>
                setForm((current) => ({ ...current, bootstrap_key: event.target.value }))
              }
              placeholder={t('auth.setup.bootstrapKeyPlaceholder')}
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />
            <Input
              label={t('auth.setup.ownerEmail')}
              type="email"
              icon={<Mail className="h-4 w-4" />}
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t('auth.setup.emailPlaceholder')}
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />
            <Input
              label={t('auth.setup.displayName')}
              icon={<User className="h-4 w-4" />}
              value={form.display_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, display_name: event.target.value }))
              }
              placeholder={t('auth.setup.displayNamePlaceholder')}
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />
            <Input
              label={t('auth.setup.password')}
              type="password"
              icon={<LockKeyhole className="h-4 w-4" />}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder={t('auth.setup.passwordPlaceholder')}
              className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
            />

            {/* Status */}
            <div className="dark:bg-[var(--kw-dark-bg)]/80 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
              {error ? (
                <span
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="text-[var(--kw-error)] dark:text-[var(--kw-error)]"
                >
                  {error}
                </span>
              ) : !isReady ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {t('auth.setup.checkingStatus')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[var(--kw-primary-500)]" />
                  {t('auth.setup.systemNotInitialized')}
                </span>
              )}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting} shimmer>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🌸</span>
                  {t('auth.setup.creating')}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  {t('auth.setup.createAccount')}
                </span>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
