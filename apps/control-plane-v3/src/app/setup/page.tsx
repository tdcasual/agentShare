'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserRoundPlus } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';

export default function SetupPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Card variant="feature" className="w-full max-w-2xl">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
              <ShieldCheck className="w-4 h-4" />
              First-run bootstrap
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gray-800">Create the founding owner account</h1>
              <p className="text-gray-600 leading-7">
                Public registration stays closed after this step. Use the bootstrap key once, create the first owner,
                and then move the team onto invite-only admin accounts.
              </p>
            </div>
            <div className="rounded-3xl border border-pink-100 bg-white/80 p-5">
              <div className="flex items-center gap-3 text-gray-800">
                <UserRoundPlus className="w-5 h-5 text-pink-500" />
                <span className="font-medium">What happens next</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li>Owner bootstrap flips the system into initialized mode.</li>
                <li>Normal management access switches to email and password.</li>
                <li>New human accounts can only be created from the admin console.</li>
              </ul>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Bootstrap Key"
              value={form.bootstrap_key}
              onChange={(event) => setForm((current) => ({ ...current, bootstrap_key: event.target.value }))}
              placeholder="changeme-bootstrap-key"
            />
            <Input
              label="Owner Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="owner@example.com"
            />
            <Input
              label="Display Name"
              value={form.display_name}
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="Founding Owner"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 12 characters"
            />

            <div className="rounded-2xl bg-white/80 border border-pink-100 px-4 py-3 text-sm text-gray-600">
              {error ?? (isReady ? 'System not initialized yet. Complete bootstrap to unlock login.' : 'Checking status...')}
            </div>

            <Button className="w-full" loading={isSubmitting} type="submit">
              Create Owner Account
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
