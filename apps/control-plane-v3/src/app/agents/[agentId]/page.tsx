'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { issueToken, setAgentStatus, useAgent, useAgentTokens } from '@/domains/agent';
import type { IssuedAgentToken } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import {
  AgentDetailSkeleton,
  OneTimeToken,
  TokenAccessPanel,
  TokenListItem,
  TokenWorkspaceSkeleton,
} from '@/features/agents/agent-token-workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [grantsDirty, setGrantsDirty] = useState(false);
  const [pendingWorkspaceChange, setPendingWorkspaceChange] = useState<
    { kind: 'token'; tokenId: string } | { kind: 'page'; offset: number } | null
  >(null);
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

  useEffect(() => {
    if (!grantsDirty) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [grantsDirty]);

  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? null;

  function requestWorkspaceChange(
    change: { kind: 'token'; tokenId: string } | { kind: 'page'; offset: number }
  ) {
    if (grantsDirty) {
      setPendingWorkspaceChange(change);
      return;
    }
    applyWorkspaceChange(change);
  }

  function applyWorkspaceChange(
    change: { kind: 'token'; tokenId: string } | { kind: 'page'; offset: number }
  ) {
    setGrantsDirty(false);
    if (change.kind === 'token') {
      setSelectedTokenId(change.tokenId);
    } else {
      setTokenOffset(change.offset);
    }
  }

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
          className="border-y border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}
      {issued && <OneTimeToken token={issued} onDone={() => setIssued(null)} />}

      <ConfirmDialog
        isOpen={pendingWorkspaceChange !== null}
        onClose={() => setPendingWorkspaceChange(null)}
        onConfirm={() => {
          if (pendingWorkspaceChange) {
            applyWorkspaceChange(pendingWorkspaceChange);
          }
          setPendingWorkspaceChange(null);
        }}
        title={t('agents.discardGrantsTitle')}
        message={t('agents.discardGrantsMessage')}
        confirmText={t('agents.discardGrants')}
        variant="danger"
      />

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
          {grantsDirty && (
            <p role="status" className="mt-2 text-sm text-status-warning-subtle-foreground">
              {t('agents.saveGrantsBeforeIssuing')}
            </p>
          )}
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
          <Button type="submit" loading={saving} disabled={grantsDirty} leftIcon={<KeyRound />}>
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
                    onSelect={() => requestWorkspaceChange({ kind: 'token', tokenId: token.id })}
                  />
                ))}
              </div>
              <PaginationControls
                offset={tokenOffset}
                limit={TOKEN_PAGE_SIZE}
                total={tokenTotal}
                onOffsetChange={(nextOffset) =>
                  requestWorkspaceChange({ kind: 'page', offset: nextOffset })
                }
              />
            </div>
            {selectedToken && (
              <TokenAccessPanel
                key={selectedToken.id}
                token={selectedToken}
                agentId={agent.id}
                onIssued={setIssued}
                onChanged={refreshTokens}
                onDirtyChange={setGrantsDirty}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
