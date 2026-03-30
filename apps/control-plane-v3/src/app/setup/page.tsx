'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { ShieldCheck, UserRoundPlus, Sparkles, Star, Heart, LockKeyhole, Mail, User } from 'lucide-react';
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
          setError(loadError instanceof Error ? loadError.message : 'Failed to load bootstrap status');
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
        setError(submitError instanceof Error ? submitError.message : 'Failed to bootstrap owner');
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
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <span className="absolute top-16 left-[8%] text-4xl opacity-10 dark:opacity-5 animate-float">🌟</span>
        <span className="absolute top-32 right-[12%] text-3xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '1s' }}>💫</span>
        <span className="absolute bottom-40 left-[15%] text-5xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '2s' }}>🎀</span>
        <span className="absolute top-48 right-[70%] text-3xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '0.5s' }}>🌸</span>
        <span className="absolute bottom-24 right-[20%] text-4xl opacity-10 dark:opacity-5 animate-float" style={{ animationDelay: '1.5s' }}>💕</span>
      </div>

      {/* Header controls */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
        <LanguageSwitcher />
        <SimpleThemeToggle />
      </div>

      <Card 
        variant="feature" 
        className="w-full max-w-3xl relative z-10 dark:bg-gradient-to-br dark:from-[#252540] dark:to-[#2D2D50] dark:border-[#3D3D5C]"
      >
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 text-3xl animate-bounce" style={{ animationDuration: '3s' }}>
          ✨
        </div>
        <div className="absolute -bottom-3 -left-3 text-2xl opacity-60">
          🌸
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left side - Info */}
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 dark:bg-[#3D3D5C] px-4 py-2 text-sm font-medium text-pink-700 dark:text-[#E891C0]">
                <ShieldCheck className="w-4 h-4" />
                <span className="uppercase tracking-wider">{t('auth.setup.subtitle')}</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-[#E8E8EC] leading-tight">
                  {t('auth.setup.title')}
                </h1>
                <p className="text-gray-600 dark:text-[#9CA3AF] leading-relaxed">
                  {t('auth.setup.description')}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-3xl border border-pink-100 dark:border-[#3D3D5C] bg-white/80 dark:bg-[#1A1A2E]/80 p-5 space-y-4">
              <div className="flex items-center gap-3 text-gray-800 dark:text-[#E8E8EC]">
                <UserRoundPlus className="w-5 h-5 text-pink-500" />
                <span className="font-semibold">{t('auth.setup.whatNext')}</span>
              </div>
              <ul className="space-y-3">
                {steps.map((step, index) => (
                  <li 
                    key={index} 
                    className="flex items-start gap-3 text-sm text-gray-600 dark:text-[#9CA3AF] animate-slide-up"
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
              <span className="animate-bounce" style={{ animationDelay: '0s' }}>🌸</span>
              <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>✨</span>
              <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>💕</span>
            </div>
          </div>

          {/* Right side - Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t('auth.setup.bootstrapKey')}
              icon={<LockKeyhole className="w-4 h-4" />}
              value={form.bootstrap_key}
              onChange={(event) => setForm((current) => ({ ...current, bootstrap_key: event.target.value }))}
              placeholder="changeme-bootstrap-key"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />
            <Input
              label={t('auth.setup.ownerEmail')}
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="owner@example.com"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />
            <Input
              label={t('auth.setup.displayName')}
              icon={<User className="w-4 h-4" />}
              value={form.display_name}
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="Founding Owner"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />
            <Input
              label={t('auth.setup.password')}
              type="password"
              icon={<LockKeyhole className="w-4 h-4" />}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 12 characters"
              className="dark:bg-[#1A1A2E] dark:border-[#3D3D5C] dark:text-[#E8E8EC]"
            />

            {/* Status */}
            <div className="rounded-2xl bg-white/80 dark:bg-[#1A1A2E]/80 border border-pink-100 dark:border-[#3D3D5C] px-4 py-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
              {error ? (
                <span className="text-red-500 dark:text-red-400">{error}</span>
              ) : !isReady ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Checking status...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  System not initialized yet. Complete bootstrap to unlock login.
                </span>
              )}
            </div>

            <Button 
              className="w-full" 
              loading={isSubmitting}
              shimmer
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">🌸</span>
                  {t('auth.setup.creating')}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
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
