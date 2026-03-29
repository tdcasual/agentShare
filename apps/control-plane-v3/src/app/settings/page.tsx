'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogOut, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/interfaces/human/layout';
import { ApiError, api, type AdminAccountCreateInput } from '@/lib/api';
import { useManagementSessionGate } from '@/lib/session';
import type { AdminAccountSummary } from '@/shared/types';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input } from '@/shared/ui-primitives/input';

export default function SettingsPage() {
  return (
    <Layout>
      <SettingsContent />
    </Layout>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { session, loading: gateLoading, error: gateError } = useManagementSessionGate();
  const [accounts, setAccounts] = useState<AdminAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    display_name: '',
    password: '',
    role: 'admin' as 'viewer' | 'operator' | 'admin',
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.getAdminAccounts();
        if (!cancelled) {
          setAccounts(response.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load admin accounts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce, session]);

  const roleCounts = useMemo(() => {
    return accounts.reduce<Record<string, number>>((accumulator, account) => {
      accumulator[account.role] = (accumulator[account.role] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [accounts]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingInvite(true);
    setError(null);

    try {
      const payload: AdminAccountCreateInput = {
        email: inviteForm.email.trim(),
        display_name: inviteForm.display_name.trim(),
        password: inviteForm.password,
        role: inviteForm.role,
      };
      await api.createAdminAccount(payload);
      setInviteForm({
        email: '',
        display_name: '',
        password: '',
        role: 'admin',
      });
      setRefreshNonce((current) => current + 1);
    } catch (inviteError) {
      if (inviteError instanceof ApiError) {
        setError(inviteError.detail);
      } else {
        setError(inviteError instanceof Error ? inviteError.message : 'Failed to invite management account');
      }
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleDisable(accountId: string) {
    setError(null);
    try {
      await api.disableAdminAccount(accountId);
      setRefreshNonce((current) => current + 1);
    } catch (disableError) {
      if (disableError instanceof ApiError) {
        setError(disableError.detail);
      } else {
        setError(disableError instanceof Error ? disableError.message : 'Failed to disable account');
      }
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    setError(null);
    try {
      await api.logout();
      router.push('/login');
    } catch (logoutError) {
      if (logoutError instanceof ApiError) {
        setError(logoutError.detail);
      } else {
        setError(logoutError instanceof Error ? logoutError.message : 'Failed to log out');
      }
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-pink-700 border border-pink-100">
            <ShieldCheck className="h-4 w-4" />
            Invite-only admin access
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Management settings</h1>
            <p className="mt-1 text-gray-600">
              Owner bootstrap is complete. Human access is now controlled through invited admin accounts only.
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={handleLogout} loading={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Accounts" value={accounts.length.toString()} hint="persisted management identities" />
        <MetricCard label="Owners" value={(roleCounts.owner ?? 0).toString()} hint="bootstrap-created founding operators" />
        <MetricCard label="Admins" value={(roleCounts.admin ?? 0).toString()} hint="full management access" />
        <MetricCard label="Operators + viewers" value={((roleCounts.operator ?? 0) + (roleCounts.viewer ?? 0)).toString()} hint="invite-only supporting roles" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card variant="kawaii" className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">
              <UserPlus className="h-4 w-4" />
              Invite management account
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Create a new admin identity</h2>
              <p className="text-sm text-gray-500">
                After first-run bootstrap, this is the only supported path for adding new human operators.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleInvite}>
            <Input
              label="Email"
              type="email"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="operator@example.com"
              required
            />
            <Input
              label="Display name"
              value={inviteForm.display_name}
              onChange={(event) => setInviteForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="Operations Lead"
              required
            />
            <Input
              label="Initial password"
              type="password"
              value={inviteForm.password}
              onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 12 characters"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
              <select
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    role: event.target.value as AdminAccountCreateInput['role'],
                  }))
                }
              >
                <option value="viewer">viewer</option>
                <option value="operator">operator</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-600">
              Public sign-up stays disabled. New accounts are created only through this invite workflow.
            </div>

            <Button type="submit" className="w-full" loading={submittingInvite}>
              Invite Account
            </Button>
          </form>
        </Card>

        <Card variant="feature" className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-pink-700 border border-pink-100">
              <UserCog className="h-4 w-4" />
              Current session
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Operator posture</h2>
              <p className="text-sm text-gray-500">
                The bootstrap credential is now reserved for first-run setup only and no longer acts as day-to-day login.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <SessionStat label="Signed in as" value={session?.email ?? 'Loading...'} />
            <SessionStat label="Role" value={session?.role ?? 'Loading...'} />
            <SessionStat label="Session id" value={session?.session_id ?? 'Loading...'} monospace />
            <SessionStat
              label="Expires"
              value={session ? new Date(session.expires_at * 1000).toLocaleString() : 'Loading...'}
            />
          </div>

          <div className="rounded-3xl border border-pink-100 bg-white/80 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800">Access model now enforced</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Bootstrap happens once to create the founding owner.</li>
                  <li>Registration is closed after bootstrap finishes.</li>
                  <li>Only invited admin accounts can open management sessions.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {(gateError || error) && (
        <Card className="border border-red-100 bg-red-50/80 text-red-700">
          {gateError ?? error}
        </Card>
      )}

      {gateLoading || loading ? (
        <Card className="text-gray-600">Loading management account inventory...</Card>
      ) : null}

      <Card variant="kawaii" className="space-y-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-pink-700 border border-pink-100">
            <Users className="h-4 w-4" />
            Invited accounts
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Management roster</h2>
            <p className="text-sm text-gray-500">
              Disable non-owner accounts here without reopening public registration.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {accounts.map((account) => {
            const isCurrentUser = session?.actor_id === account.id;
            const canDisable = account.role !== 'owner' && account.status === 'active';

            return (
              <Card key={account.id} className="space-y-4 border border-pink-100 bg-white/90">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={account.role === 'owner' ? 'primary' : account.role === 'admin' ? 'secondary' : 'default'}>
                        {account.role}
                      </Badge>
                      <Badge variant={account.status === 'active' ? 'success' : 'warning'}>{account.status}</Badge>
                      {isCurrentUser ? <Badge variant="info">current session</Badge> : null}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{account.display_name}</h3>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisable(account.id)}
                      disabled={!canDisable}
                    >
                      Disable
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <SessionStat label="Account id" value={account.id} monospace />
                  <SessionStat label="Last login" value={account.last_login_at ? new Date(account.last_login_at).toLocaleString() : 'Never'} />
                  <SessionStat label="Availability" value={account.status === 'active' ? 'Can log in' : 'Access disabled'} />
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{hint}</p>
    </Card>
  );
}

function SessionStat({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400">{label}</p>
      <p className={`mt-2 text-sm font-medium text-gray-800 ${monospace ? 'break-all font-mono' : ''}`}>{value}</p>
    </div>
  );
}
