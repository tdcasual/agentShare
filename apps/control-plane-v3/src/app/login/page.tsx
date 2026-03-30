'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { LockKeyhole, Mail, Sparkles, Heart } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
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
        if (!cancelled && !bootstrap.initialized) {
          router.replace('/setup');
          return;
        }

        const session = await api.getSession();
        if (!cancelled && session.status === 'authenticated') {
          router.replace('/tokens');
        }
      } catch (loadError) {
        if (!cancelled && !(loadError instanceof ApiError && loadError.status === 401)) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load login state');
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
        setError(submitError instanceof Error ? submitError.message : 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <span className="absolute top-20 left-[10%] text-4xl opacity-10 dark:opacity-5 animate-float">🌸</span>
        <span className="absolute top-40 right-[15%] text-3xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '1s' }}>✨</span>
        <span className="absolute bottom-32 left-[20%] text-5xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '2s' }}>💕</span>
        <span className="absolute top-60 left-[70%] text-3xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '0.5s' }}>🌟</span>
        <span className="absolute bottom-20 right-[25%] text-4xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '1.5s' }}>🎀</span>
      </div>

      {/* Header controls */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card 
        variant="kawaii" 
        className="w-full max-w-xl relative z-10 dark:bg-gradient-to-br dark:from-[#252540] dark:to-[#2D2D50] dark:border-[#3D3D5C]"
      >
        {/* Decorative elements */}
        <div className="absolute -top-3 -right-3 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
          🌸
        </div>
        <div className="absolute -bottom-2 -left-2 text-xl opacity-50">
          ✨
        </div>

        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 dark:bg-[#3D3D5C] text-pink-600 dark:text-[#E891C0] text-sm font-medium">
              <Heart className="w-4 h-4" />
              <span className="uppercase tracking-wider">{t('auth.login.subtitle')}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {t('auth.login.title')}
            </h1>
            <p className="text-gray-600 dark:text-[#9CA3AF] max-w-sm mx-auto">
              {t('auth.login.description')}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label={t('auth.login.email')}
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="owner@example.com"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />
            <Input
              label={t('auth.login.password')}
              type="password"
              icon={<LockKeyhole className="w-4 h-4" />}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••••••"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />

            {/* Status message */}
            <div className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-pink-50/50 dark:bg-[#1A1A2E]/50 px-4 py-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
              {error ? (
                <span className="text-red-500 dark:text-red-400">{error}</span>
              ) : checking ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  {t('auth.login.checking')}
                </span>
              ) : (
                <span>🎀 {t('auth.login.description')}</span>
              )}
            </div>

            <Button 
              className="w-full" 
              type="submit" 
              loading={isSubmitting}
              shimmer
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🌸</span>
                  {t('auth.login.signIn')}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('auth.login.signIn')}
                </span>
              )}
            </Button>
          </form>

          {/* Footer decoration */}
          <div className="flex justify-center gap-2 text-2xl opacity-30 dark:opacity-20">
            <span className="animate-bounce" style={{ animationDelay: '0s' }}>🌸</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
            <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>💕</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
