'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Card variant="kawaii" className="w-full max-w-xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Invite-only access</p>
            <h1 className="text-4xl font-bold text-gray-800">Management login</h1>
            <p className="text-gray-600">Use the persisted admin account you bootstrapped or were invited into.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="owner@example.com"
            />
            <Input
              label="Password"
              type="password"
              icon={<LockKeyhole className="w-4 h-4" />}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••••••"
            />

            <div className="rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-600">
              {error ?? (checking ? 'Checking bootstrap and session state...' : 'Login opens the token, review, and task control surfaces.')}
            </div>

            <Button className="w-full" type="submit" loading={isSubmitting}>
              Sign In
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
