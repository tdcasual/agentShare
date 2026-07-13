'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { login, type LoginInput } from '@/lib/vaultgate-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <SimpleThemeToggle />
      </div>

      <Card className="relative z-10 w-full max-w-xl">
        <div className="space-y-3 p-6 sm:space-y-5 sm:p-8 lg:space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t('auth.login.title')}
            </h1>
            <p className="mx-auto max-w-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
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
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
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
              {t('auth.login.signIn')}
            </Button>
          </form>

          {/* Footer info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>{t('auth.login.pageTitle')}</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
