'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import {
  issueToken,
  revokeToken,
  rotateToken,
  saveGrants,
  setAgentStatus,
  useAgent,
  useAgentTokens,
  useTokenGrants,
} from '@/domains/agent';
import { useSecrets } from '@/domains/secret';
import type { AgentToken, IssuedAgentToken, SecretType } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { SECRET_TYPES } from '@/features/secrets/secret-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SECRET_PAGE_SIZE = 25;
const TOKEN_PAGE_SIZE = 25;
const TTL_OPTIONS = [
  { value: 'none', seconds: undefined },
  { value: '3600', seconds: 3600 },
  { value: '86400', seconds: 86400 },
  { value: '604800', seconds: 604800 },
  { value: '2592000', seconds: 2592000 },
] as const;

export default function AgentDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ agentId: string }>();
  const { agent, isLoading, error, refresh } = useAgent(params.agentId);
  const [tokenOffset, setTokenOffset] = useState(0);
  const {
    tokens,
    total: tokenTotal,
    isLoading: tokensLoading,
    error: tokensError,
    refresh: refreshTokens,
  } = useAgentTokens(params.agentId, { limit: TOKEN_PAGE_SIZE, offset: tokenOffset });
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [ttl, setTtl] = useState('none');
  const [issued, setIssued] = useState<IssuedAgentToken | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    if (tokens.length === 0) {
      setSelectedTokenId(null);
    } else if (!selectedTokenId || !tokens.some((token) => token.id === selectedTokenId)) {
      setSelectedTokenId(tokens[0].id);
    }
  }, [selectedTokenId, tokens]);

  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? null;

  async function changeAgentStatus(status: 'active' | 'disabled') {
    setActionError(null);
    setStatusSaving(true);
    try {
      await setAgentStatus(params.agentId, status);
      setConfirmDisable(false);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
    } finally {
      setStatusSaving(false);
    }
  }

  async function createToken(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      const ttlSeconds = TTL_OPTIONS.find((option) => option.value === ttl)?.seconds;
      const created = await issueToken(params.agentId, {
        name: tokenName.trim(),
        description: tokenDescription.trim() || undefined,
        ttl_seconds: ttlSeconds,
      });
      setIssued(created);
      setTokenName('');
      setTokenDescription('');
      setTtl('none');
      setTokenOffset(0);
      await refreshTokens();
      setSelectedTokenId(created.id);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <AgentDetailSkeleton />;
  }
  if (error || !agent) {
    return (
      <main id="main-content" className="mx-auto max-w-3xl p-6 lg:p-10">
        <EmptyState
          title={t('agents.notFound')}
          description={error?.message}
          icon={<ShieldOff className="h-6 w-6" />}
          action={
            <Button asChild variant="outline">
              <Link href="/agents">{t('agents.backToAgents')}</Link>
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-6">
        <Link
          href="/agents"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('agents.backToAgents')}
        </Link>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight">
                {agent.name}
              </h1>
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                {t(`agents.status.${agent.status}`)}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {agent.description || t('agents.noDescription')}
            </p>
          </div>
          <Button
            variant="secondary"
            loading={statusSaving}
            leftIcon={agent.status === 'active' ? <ShieldOff /> : <ShieldCheck />}
            onClick={() =>
              agent.status === 'active' ? setConfirmDisable(true) : void changeAgentStatus('active')
            }
          >
            {agent.status === 'active' ? t('agents.disable') : t('agents.enable')}
          </Button>
        </div>
      </header>

      {actionError && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 border-y px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}
      {issued && <OneTimeToken token={issued} onDone={() => setIssued(null)} />}

      <ConfirmDialog
        isOpen={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => void changeAgentStatus('disabled')}
        title={t('agents.disableConfirmTitle')}
        message={t('agents.disableConfirmMessage', { name: agent.name })}
        confirmText={t('agents.confirmDisable')}
        isLoading={statusSaving}
        variant="danger"
      />

      <section aria-labelledby="issue-token-heading" className="border-b pb-7">
        <div className="mb-4">
          <h2 id="issue-token-heading" className="text-lg font-semibold">
            {t('agents.issueToken')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('agents.issueTokenDescription')}</p>
        </div>
        <form
          className="grid gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_190px_auto] lg:items-end"
          onSubmit={createToken}
        >
          <div className="space-y-2">
            <Label htmlFor="token-name">{t('agents.tokenName')}</Label>
            <Input
              id="token-name"
              value={tokenName}
              maxLength={255}
              onChange={(event) => setTokenName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token-description">{t('agents.tokenDescription')}</Label>
            <Input
              id="token-description"
              value={tokenDescription}
              maxLength={2000}
              onChange={(event) => setTokenDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token-ttl">{t('agents.tokenTtl')}</Label>
            <Select value={ttl} onValueChange={setTtl}>
              <SelectTrigger id="token-ttl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`agents.ttl.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" loading={saving} leftIcon={<KeyRound />}>
            {t('agents.issueToken')}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t('agents.tokens')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('agents.tokensDescription')}</p>
        </div>

        {tokensLoading ? (
          <TokenWorkspaceSkeleton />
        ) : tokensError ? (
          <EmptyState
            title={t('agents.tokenLoadFailed')}
            description={tokensError.message}
            icon={<KeyRound className="h-6 w-6" />}
          />
        ) : tokens.length === 0 ? (
          <EmptyState
            title={t('agents.noTokens')}
            description={t('agents.noTokensDescription')}
            icon={<KeyRound className="h-6 w-6" />}
            className="border-y"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
            <div className="min-w-0">
              <div className="divide-y border-y">
                {tokens.map((token) => (
                  <TokenListItem
                    key={token.id}
                    token={token}
                    selected={token.id === selectedTokenId}
                    onSelect={() => setSelectedTokenId(token.id)}
                  />
                ))}
              </div>
              <PaginationControls
                offset={tokenOffset}
                limit={TOKEN_PAGE_SIZE}
                total={tokenTotal}
                onOffsetChange={setTokenOffset}
              />
            </div>
            {selectedToken && (
              <TokenAccessPanel
                key={selectedToken.id}
                token={selectedToken}
                agentId={agent.id}
                onIssued={setIssued}
                onChanged={refreshTokens}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function OneTimeToken({ token, onDone }: { token: IssuedAgentToken; onDone: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
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
        <p role="alert" className="mt-2 text-sm">
          {t('agents.copyFailed')}
        </p>
      )}
    </Callout>
  );
}

function TokenListItem({
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
      className={`w-full px-3 py-4 text-left transition-colors ${selected ? 'bg-accent text-foreground' : 'hover:bg-accent/50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{token.name}</span>
            <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
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

function TokenAccessPanel({
  token,
  agentId,
  onIssued,
  onChanged,
}: {
  token: AgentToken;
  agentId: string;
  onIssued: (token: IssuedAgentToken) => void;
  onChanged: () => void | Promise<unknown>;
}) {
  const { t, locale } = useI18n();
  const { secretIds, error: grantsError, isLoading: grantsLoading } = useTokenGrants(token.id);
  const [secretOffset, setSecretOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SecretType>('all');
  const {
    secrets,
    total: secretTotal,
    error: secretsError,
    isLoading: secretsLoading,
  } = useSecrets({
    limit: SECRET_PAGE_SIZE,
    offset: secretOffset,
    search: search.trim() || undefined,
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

  useEffect(() => {
    if (!selectionDirty) {
      setSelected(secretIds);
    }
  }, [secretIds, selectionDirty]);

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
    <Card className="min-w-0 overflow-hidden shadow-none lg:sticky lg:top-20">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{token.name}</h3>
              <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
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
              disabled={pendingAction !== null}
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

      <fieldset className="min-w-0 p-5">
        <legend className="px-1 text-sm font-semibold">{t('agents.secretAccess')}</legend>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t('agents.selectedSecrets', { count: selected.length })}</span>
          {selectionDirty && (
            <span className="font-medium text-status-warning-subtle-foreground">
              {t('agents.unsavedChanges')}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
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
                className="hover:bg-accent/50 flex min-h-12 cursor-pointer items-start gap-3 px-2 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
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
                await saveGrants(token.id, selected);
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
            <p role="status" className="text-sm text-status-success">
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

function AgentDetailSkeleton() {
  return (
    <main id="main-content" className="mx-auto max-w-screen-2xl space-y-6 p-6 lg:p-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <TokenWorkspaceSkeleton />
    </main>
  );
}

function TokenWorkspaceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-[34rem] w-full" />
    </div>
  );
}
