'use client';

import { FormEvent, useMemo, useState } from 'react';
import { LogOut, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/interfaces/human/layout';
import { useAdminAccounts, useCreateAdminAccount, useDisableAdminAccount, useLogout } from '@/domains/identity';
import { ApiError } from '@/lib/api-client';
import { ManagementSessionExpiredAlert, useManagementPageSessionRecovery } from '@/lib/management-session-recovery';
import { useI18n } from '@/components/i18n-provider';
import type { AdminAccountCreateInput } from '@/lib/api-client';
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
  const { t } = useI18n();
  const router = useRouter();
  // 使用 SWR hooks
  const { data: accountsData, isLoading, error: dataError } = useAdminAccounts();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);
  const createAdminAccount = useCreateAdminAccount();
  const disableAdminAccount = useDisableAdminAccount();
  const logout = useLogout();
  
  const accounts = accountsData?.items ?? [];
  
  // 本地 UI 状态
  const [error, setError] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    display_name: '',
    password: '',
    role: 'admin' as 'viewer' | 'operator' | 'admin',
  });

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
    clearSessionExpired();

    try {
      const payload: AdminAccountCreateInput = {
        email: inviteForm.email.trim(),
        display_name: inviteForm.display_name.trim(),
        password: inviteForm.password,
        role: inviteForm.role,
      };
      await createAdminAccount(payload);
      setInviteForm({
        email: '',
        display_name: '',
        password: '',
        role: 'admin',
      });
    } catch (inviteError) {
      if (consumeUnauthorized(inviteError)) {
        return;
      }

      if (inviteError instanceof ApiError) {
        setError(inviteError.detail);
      } else {
        setError(inviteError instanceof Error ? inviteError.message : t('settings.inviteError'));
      }
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleDisable(accountId: string) {
    setError(null);
    clearSessionExpired();
    try {
      await disableAdminAccount(accountId);
    } catch (disableError) {
      if (consumeUnauthorized(disableError)) {
        return;
      }

      if (disableError instanceof ApiError) {
        setError(disableError.detail);
      } else {
        setError(disableError instanceof Error ? disableError.message : t('settings.disableError'));
      }
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    setError(null);
    clearSessionExpired();
    try {
      await logout();
      router.push('/login');
    } catch (logoutError) {
      if (consumeUnauthorized(logoutError)) {
        router.push('/login');
        return;
      }

      if (logoutError instanceof ApiError) {
        setError(logoutError.detail);
      } else {
        setError(logoutError instanceof Error ? logoutError.message : t('settings.logoutError'));
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
            {t('settings.inviteOnlyAccess')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('settings.title')}</h1>
            <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">
              {t('settings.description')}
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={handleLogout} loading={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('settings.signOut')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('settings.accounts')} value={accounts.length.toString()} hint={t('settings.accountsHint')} />
        <MetricCard label={t('settings.owners')} value={(roleCounts.owner ?? 0).toString()} hint={t('settings.ownersHint')} />
        <MetricCard label={t('settings.admins')} value={(roleCounts.admin ?? 0).toString()} hint={t('settings.adminsHint')} />
        <MetricCard label={t('settings.operatorsViewers')} value={((roleCounts.operator ?? 0) + (roleCounts.viewer ?? 0)).toString()} hint={t('settings.operatorsViewersHint')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card variant="kawaii" className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">
              <UserPlus className="h-4 w-4" />
              {t('settings.inviteAccount')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('settings.createAdminTitle')}</h2>
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                {t('settings.createAdminDesc')}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleInvite}>
            <Input
              label={t('settings.email')}
              type="email"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="operator@example.com"
              required
            />
            <Input
              label={t('settings.displayName')}
              value={inviteForm.display_name}
              onChange={(event) => setInviteForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder={t('settings.displayNamePlaceholder')}
              required
            />
            <Input
              label={t('settings.initialPassword')}
              type="password"
              value={inviteForm.password}
              onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={t('settings.passwordPlaceholder')}
              required
            />
            <div>
              <label htmlFor="role-select" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">{t('settings.role')}</label>
              <select
                id="role-select"
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    role: event.target.value as AdminAccountCreateInput['role'],
                  }))
                }
              >
                <option value="viewer">{t('settings.roles.viewer')}</option>
                <option value="operator">{t('settings.roles.operator')}</option>
                <option value="admin">{t('settings.roles.admin')}</option>
              </select>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
              {t('settings.inviteNotice')}
            </div>

            <Button type="submit" className="w-full" loading={submittingInvite}>
              {t('settings.inviteAccount')}
            </Button>
          </form>
        </Card>

        <Card variant="feature" className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-pink-700 border border-pink-100">
              <UserCog className="h-4 w-4" />
              {t('settings.currentSession')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('settings.operatorPosture')}</h2>
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                {t('settings.operatorPostureDesc')}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <SessionStat label={t('settings.signedInAs')} value={session?.email ?? t('common.loading')} />
            <SessionStat label={t('settings.role')} value={session?.role ?? t('common.loading')} />
            <SessionStat label={t('settings.sessionId')} value={session?.session_id ?? t('common.loading')} monospace />
            <SessionStat
              label={t('settings.expires')}
              value={session ? new Date(typeof session.expires_at === 'number' ? session.expires_at * 1000 : session.expires_at).toLocaleString() : t('common.loading')}
            />
          </div>

          <div className="rounded-3xl border border-pink-100 bg-white/80 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('settings.accessModel')}</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-[#9CA3AF]">
                  <li>{t('settings.accessModel1')}</li>
                  <li>{t('settings.accessModel2')}</li>
                  <li>{t('settings.accessModel3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert
          className="border-red-100 bg-red-50/80 text-red-700"
          message="Your management session has expired. Sign in again to continue managing operators and access."
        />
      ) : null}

      {(gateError || error || (!shouldShowSessionExpired && dataError)) && (
        <Card 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700"
        >
          {gateError ?? error ?? (dataError instanceof Error ? dataError.message : 'Failed to load accounts')}
        </Card>
      )}

      {gateLoading || isLoading ? (
        <Card className="text-gray-600 dark:text-[#9CA3AF]">{t('settings.loadingInventory')}</Card>
      ) : null}

      <Card variant="kawaii" className="space-y-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-pink-700 border border-pink-100">
            <Users className="h-4 w-4" />
            {t('settings.invitedAccounts')}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('settings.managementRoster')}</h2>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              {t('settings.rosterDesc')}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {accounts.map((account) => {
            const isCurrentUser = session?.actor_id === account.id;
            const canDisable = account.role !== 'owner' && account.status === 'active';

            return (
              <Card key={account.id} className="space-y-4 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={account.role === 'owner' ? 'primary' : account.role === 'admin' ? 'secondary' : 'default'}>
                        {account.role}
                      </Badge>
                      <Badge variant={account.status === 'active' ? 'success' : 'warning'}>{account.status}</Badge>
                      {isCurrentUser ? <Badge variant="info">{t('settings.currentSession')}</Badge> : null}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{account.display_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{account.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisable(account.id)}
                      disabled={!canDisable}
                    >
                      {t('settings.disable')}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <SessionStat label={t('settings.accountId')} value={account.id} monospace />
                  <SessionStat label={t('settings.lastLogin')} value={account.last_login_at ? new Date(account.last_login_at).toLocaleString() : t('settings.never')} />
                  <SessionStat label={t('settings.availability')} value={account.status === 'active' ? t('settings.canLogin') : t('settings.accessDisabled')} />
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
    <Card className="space-y-2 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">{label}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{hint}</p>
    </Card>
  );
}

function SessionStat({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-[#9CA3AF]">{label}</p>
      <p className={`mt-2 text-sm font-medium text-gray-800 dark:text-[#E8E8EC] ${monospace ? 'break-all font-mono' : ''}`}>{value}</p>
    </div>
  );
}
