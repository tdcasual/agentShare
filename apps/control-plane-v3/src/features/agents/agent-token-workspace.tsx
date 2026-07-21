'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, KeyRound, RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { revokeToken, rotateToken, saveGrants, useTokenGrants } from '@/domains/agent';
import { useSecrets } from '@/domains/secret';
import type { AgentToken, IssuedAgentToken, SecretType } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { SECRET_TYPES } from '@/features/secrets/secret-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const SECRET_PAGE_SIZE = 25;

export function OneTimeToken({ token, onDone }: { token: IssuedAgentToken; onDone: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [token.token]);
  return (
    <Callout variant="warning" icon={<KeyRound className="h-4 w-4" />}>
      <p className="font-medium">{t('agents.copyNow')}</p>
      <p className="mt-1 text-sm">{t('agents.copyNowDescription')}</p>
      <code className="mt-3 block break-all rounded-md border bg-background p-3 text-sm">
        {token.token}
      </code>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={copied ? <Check /> : <Copy />}
          onClick={async () => {
            setCopyError(false);
            try {
              await navigator.clipboard.writeText(token.token);
              setCopied(true);
              toast.success(t('common.copySuccess'));
            } catch {
              setCopyError(true);
            }
          }}
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          {t('common.done')}
        </Button>
      </div>
      {copyError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t('agents.copyFailed')}
        </p>
      )}
    </Callout>
  );
}

export function TokenListItem({
  token,
  selected,
  onSelect,
}: {
  token: AgentToken;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full px-3 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected ? 'bg-accent text-foreground' : 'hover:bg-accent/50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{token.name}</span>
            <Badge variant={token.status === 'active' ? 'success' : 'secondary'}>
              {t(`agents.tokenStatus.${token.status}`)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{token.key_prefix}…</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {token.last_used_at ? formatDate(token.last_used_at, locale) : t('agents.neverUsed')}
        </span>
      </div>
    </button>
  );
}

export function TokenAccessPanel({
  token,
  agentId,
  onIssued,
  onChanged,
  onDirtyChange,
}: {
  token: AgentToken;
  agentId: string;
  onIssued: (token: IssuedAgentToken) => void;
  onChanged: () => void | Promise<unknown>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { secretIds, error: grantsError, isLoading: grantsLoading } = useTokenGrants(token.id);
  const [secretOffset, setSecretOffset] = useState(0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDebouncedValue(search.trim());
  const [typeFilter, setTypeFilter] = useState<'all' | SecretType>('all');
  const {
    secrets,
    total: secretTotal,
    error: secretsError,
    isLoading: secretsLoading,
  } = useSecrets({
    limit: SECRET_PAGE_SIZE,
    offset: secretOffset,
    search: deferredSearch || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<'rotate' | 'revoke' | null>(null);
  const [confirmation, setConfirmation] = useState<'rotate' | 'revoke' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // 已吊销 Token 的授权变更不会生效：禁用整个授权面板，轮换回 active 后自动恢复
  const grantsDisabled = token.status !== 'active';

  useEffect(() => {
    if (!selectionDirty) {
      setSelected(secretIds);
    }
  }, [secretIds, selectionDirty]);

  useEffect(() => {
    onDirtyChange(selectionDirty);
    return () => onDirtyChange(false);
  }, [onDirtyChange, selectionDirty]);

  async function executeTokenAction(action: 'rotate' | 'revoke') {
    setActionError(null);
    setPendingAction(action);
    try {
      if (action === 'rotate') {
        onIssued(await rotateToken(agentId, token.id));
      } else {
        await revokeToken(agentId, token.id);
      }
      setConfirmation(null);
      await onChanged();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
    } finally {
      setPendingAction(null);
    }
  }

  function updateSelection(next: string[]) {
    setSelectionDirty(true);
    setSaved(false);
    setSelected(Array.from(new Set(next)));
  }

  return (
    <Card className="min-w-0 overflow-hidden lg:sticky lg:top-20">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{token.name}</h3>
              <Badge variant={token.status === 'active' ? 'success' : 'secondary'}>
                {t(`agents.tokenStatus.${token.status}`)}
              </Badge>
            </div>
            {token.description && (
              <p className="mt-1 text-sm text-muted-foreground">{token.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              loading={pendingAction === 'rotate'}
              disabled={token.status !== 'active' || pendingAction !== null}
              leftIcon={<RotateCcw />}
              onClick={() => setConfirmation('rotate')}
            >
              {t('agents.rotate')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={pendingAction === 'revoke'}
              disabled={token.status !== 'active' || pendingAction !== null}
              leftIcon={<Trash2 />}
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmation('revoke')}
            >
              {t('agents.revoke')}
            </Button>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <TokenMeta label={t('agents.prefix')} value={`${token.key_prefix}…`} />
          <TokenMeta
            label={t('agents.expires')}
            value={token.expires_at ? formatDate(token.expires_at, locale) : t('agents.noExpiry')}
          />
          <TokenMeta
            label={t('agents.lastUsed')}
            value={
              token.last_used_at ? formatDate(token.last_used_at, locale) : t('agents.neverUsed')
            }
          />
        </dl>
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {actionError}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        onConfirm={() => confirmation && void executeTokenAction(confirmation)}
        title={t(
          confirmation === 'rotate' ? 'agents.rotateConfirmTitle' : 'agents.revokeConfirmTitle'
        )}
        message={t(
          confirmation === 'rotate' ? 'agents.rotateConfirmMessage' : 'agents.revokeConfirmMessage',
          { name: token.name }
        )}
        confirmText={t(confirmation === 'rotate' ? 'agents.confirmRotate' : 'agents.confirmRevoke')}
        isLoading={pendingAction !== null}
        variant="danger"
      />

      <fieldset className="min-w-0 p-5 disabled:opacity-70" disabled={saving || grantsDisabled}>
        <legend className="px-1 text-sm font-semibold">{t('agents.secretAccess')}</legend>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t('agents.selectedSecrets', { count: selected.length })}</span>
          {selectionDirty && (
            <span className="font-medium text-status-warning-subtle-foreground">
              {t('agents.unsavedChanges')}
            </span>
          )}
        </div>
        {grantsDisabled && (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {t('agents.grantsDisabledRevoked')}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              maxLength={255}
              onChange={(event) => {
                setSearch(event.target.value);
                setSecretOffset(0);
              }}
              className="pl-10"
              placeholder={t('agents.searchSecrets')}
              aria-label={t('agents.searchSecrets')}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as 'all' | SecretType);
              setSecretOffset(0);
            }}
          >
            <SelectTrigger aria-label={t('agents.filterSecretType')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('secrets.allTypes')}</SelectItem>
              {SECRET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`secrets.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => updateSelection([...selected, ...secrets.map((secret) => secret.id)])}
          >
            {t('agents.selectPage')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => updateSelection([])}>
            {t('agents.clearSelection')}
          </Button>
        </div>

        {secretsLoading || grantsLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : secrets.length === 0 ? (
          <p className="mt-4 border-y py-6 text-center text-sm text-muted-foreground">
            {t('agents.noMatchingSecrets')}
          </p>
        ) : (
          <div className="mt-3 divide-y border-y">
            {secrets.map((secret) => (
              <label
                key={secret.id}
                className="flex min-h-12 cursor-pointer items-start gap-3 px-2 py-3 text-sm hover:bg-accent/50"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  checked={selectedSet.has(secret.id)}
                  onChange={(event) =>
                    updateSelection(
                      event.target.checked
                        ? [...selected, secret.id]
                        : selected.filter((id) => id !== secret.id)
                    )
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{secret.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {t(`secrets.types.${secret.type}`)}
                    {secret.tags.length ? ` · ${secret.tags.join(', ')}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {(secretsError || grantsError) && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {secretsError?.message || grantsError?.message}
          </p>
        )}
        <PaginationControls
          offset={secretOffset}
          limit={SECRET_PAGE_SIZE}
          total={secretTotal}
          onOffsetChange={setSecretOffset}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            loading={saving}
            disabled={!selectionDirty || grantsLoading || Boolean(grantsError)}
            leftIcon={<CheckCircle2 />}
            onClick={async () => {
              setActionError(null);
              setSaved(false);
              setSaving(true);
              try {
                const grants = await saveGrants(token.id, selected);
                setSelected(grants.secret_ids);
                setSelectionDirty(false);
                setSaved(true);
              } catch (caught) {
                setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
              } finally {
                setSaving(false);
              }
            }}
          >
            {t('agents.saveAccess')}
          </Button>
          {saved && (
            <p role="status" className="text-sm text-status-success-subtle-foreground">
              {t('agents.accessSaved')}
            </p>
          )}
        </div>
      </fieldset>
    </Card>
  );
}

function TokenMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

export function AgentDetailSkeleton() {
  return (
    <main id="main-content" className="mx-auto max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <TokenWorkspaceSkeleton />
    </main>
  );
}

export function TokenWorkspaceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-[34rem] w-full" />
    </div>
  );
}
