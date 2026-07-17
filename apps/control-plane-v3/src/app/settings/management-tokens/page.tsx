'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { Check, Clipboard, KeyRound, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  createManagementToken,
  listManagementTokens,
  revokeManagementToken,
  rotateManagementToken,
  type IssuedManagementToken,
  type ManagementToken,
} from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PAGE_SIZE = 100;

export default function ManagementTokensPage() {
  const { t, locale } = useI18n();
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/management-tokens?limit=100&offset=0',
    () => listManagementTokens({ limit: PAGE_SIZE, offset: 0 })
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ttl, setTtl] = useState('2592000');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedManagementToken | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    token: ManagementToken;
    action: 'revoke' | 'rotate';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await createManagementToken({
        name: name.trim(),
        description: description.trim() || undefined,
        ttl_seconds: ttl === 'none' ? undefined : Number(ttl),
      });
      setIssued(created);
      setCopied(false);
      setName('');
      setDescription('');
      await mutate();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t('managementTokens.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmAction() {
    if (!confirmTarget) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmTarget.action === 'revoke') {
        await revokeManagementToken(confirmTarget.token.id);
      } else {
        setIssued(await rotateManagementToken(confirmTarget.token.id));
        setCopied(false);
      }
      setConfirmTarget(null);
      await mutate();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('managementTokens.actionFailed'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          VaultGate
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t('managementTokens.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t('managementTokens.description')}
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form className="space-y-4 border-y py-5" onSubmit={submit}>
          <div>
            <h2 className="text-lg font-semibold">{t('managementTokens.createTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('managementTokens.createDescription')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="management-token-name">{t('managementTokens.name')}</Label>
            <Input
              id="management-token-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="management-token-description">
              {t('managementTokens.tokenDescription')}
            </Label>
            <Input
              id="management-token-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="management-token-ttl">{t('managementTokens.ttl')}</Label>
            <select
              id="management-token-ttl"
              value={ttl}
              onChange={(event) => setTtl(event.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="none">{t('managementTokens.ttlNone')}</option>
              <option value="86400">{t('managementTokens.ttlDay')}</option>
              <option value="604800">{t('managementTokens.ttlWeek')}</option>
              <option value="2592000">{t('managementTokens.ttlMonth')}</option>
              <option value="31536000">{t('managementTokens.ttlYear')}</option>
            </select>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" loading={saving} leftIcon={<Plus />}>
            {t('managementTokens.create')}
          </Button>
        </form>

        <section aria-live="polite" className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">{t('managementTokens.listTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('managementTokens.count', { count: data?.total ?? 0 })}
              </p>
            </div>
            <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          {isLoading ? (
            <p className="py-8 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : error ? (
            <p role="alert" className="py-8 text-sm text-destructive">
              {error.message}
            </p>
          ) : !data?.items.length ? (
            <EmptyState
              title={t('managementTokens.emptyTitle')}
              description={t('managementTokens.emptyDescription')}
              icon={<KeyRound className="h-6 w-6" />}
              className="border-y"
            />
          ) : (
            <div className="divide-y border-y">
              {data.items.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  locale={locale}
                  onRevoke={() => setConfirmTarget({ token, action: 'revoke' })}
                  onRotate={() => setConfirmTarget({ token, action: 'rotate' })}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {issued && (
        <Callout variant="warning" icon={<KeyRound className="h-5 w-5" />}>
          <div className="space-y-3">
            <p className="font-semibold">{t('managementTokens.issuedTitle')}</p>
            <p className="text-sm">{t('managementTokens.issuedDescription')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-sm">
                {issued.token}
              </code>
              <Button
                type="button"
                variant="outline"
                leftIcon={copied ? <Check /> : <Clipboard />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issued.token);
                    setCopied(true);
                  } catch {
                    setActionError(t('managementTokens.copyFailed'));
                  }
                }}
              >
                {t(copied ? 'common.copied' : 'common.copy')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIssued(null);
                  setCopied(false);
                }}
              >
                {t('common.done')}
              </Button>
            </div>
          </div>
        </Callout>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => void confirmAction()}
        isLoading={actionLoading}
        variant={confirmTarget?.action === 'revoke' ? 'danger' : 'primary'}
        title={
          confirmTarget?.action === 'revoke'
            ? t('managementTokens.revokeTitle')
            : t('managementTokens.rotateTitle')
        }
        message={
          confirmTarget
            ? t(
                confirmTarget.action === 'revoke'
                  ? 'managementTokens.revokeMessage'
                  : 'managementTokens.rotateMessage',
                { name: confirmTarget.token.name }
              )
            : undefined
        }
        confirmText={
          confirmTarget?.action === 'revoke'
            ? t('managementTokens.revoke')
            : t('managementTokens.rotate')
        }
      />
    </main>
  );
}

function TokenRow({
  token,
  locale,
  onRevoke,
  onRotate,
  t,
}: {
  token: ManagementToken;
  locale: string;
  onRevoke: () => void;
  onRotate: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const revoked = Boolean(token.revoked_at);
  const expired = Boolean(token.expires_at && new Date(token.expires_at).getTime() <= Date.now());
  const statusKey = revoked
    ? 'managementTokens.revoked'
    : expired
      ? 'managementTokens.expired'
      : 'managementTokens.active';
  return (
    <div className="grid gap-3 px-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{token.name}</h3>
          <span
            className={`text-xs ${revoked || expired ? 'text-destructive' : 'text-status-success'}`}
          >
            {t(statusKey)}
          </span>
        </div>
        {token.description && (
          <p className="mt-1 text-sm text-muted-foreground">{token.description}</p>
        )}
        <p className="mt-1 font-mono text-xs text-muted-foreground">{token.key_prefix}...</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('managementTokens.expiresAt', {
            date: token.expires_at
              ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  new Date(token.expires_at)
                )
              : t('managementTokens.never'),
          })}
          {' · '}
          {t('managementTokens.lastUsedAt', {
            date: token.last_used_at
              ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  new Date(token.last_used_at)
                )
              : t('managementTokens.never'),
          })}
        </p>
        {token.revoked_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('managementTokens.revokedAt', {
              date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                new Date(token.revoked_at)
              ),
            })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 sm:self-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRotate}
          leftIcon={<RotateCcw />}
        >
          {t('managementTokens.rotate')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRevoke}
          disabled={revoked || expired}
          leftIcon={revoked ? <Check /> : <Trash2 />}
        >
          {t(revoked ? 'managementTokens.revoked' : 'managementTokens.revoke')}
        </Button>
      </div>
    </div>
  );
}
