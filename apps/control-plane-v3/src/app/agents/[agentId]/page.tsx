'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
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
import { InlineAlert } from '@/components/ui/inline-alert';
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

type WorkspaceChange =
  | { kind: 'token'; tokenId: string }
  | { kind: 'page'; offset: number }
  | { kind: 'navigate'; href: string }
  | { kind: 'history' };

export default function AgentDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const { agent, isLoading, error, refresh } = useAgent(params.agentId);
  const [tokenOffset, setTokenOffset] = useState(0);
  const {
    tokens,
    total: tokenTotal,
    isLoading: tokensLoading,
    error: tokensError,
    refresh: refreshTokens,
    data: tokensData,
  } = useAgentTokens(params.agentId, { limit: TOKEN_PAGE_SIZE, offset: tokenOffset });
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [grantsDirty, setGrantsDirty] = useState(false);
  const [pendingWorkspaceChange, setPendingWorkspaceChange] = useState<WorkspaceChange | null>(
    null
  );
  const [tokenName, setTokenName] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [ttl, setTtl] = useState('none');
  const [issued, setIssued] = useState<IssuedAgentToken | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  // 确认离开后的放行标志：history.go(-2) 触发的 popstate 直接放行
  const historyBypassRef = useRef(false);

  useEffect(() => {
    // SWR key 变化（翻页/刷新）期间 data 为 undefined：保留当前选择，
    // 等数据到达后再做修正，避免误清空用户已选的 Token。
    if (tokensData === undefined) {
      return;
    }
    if (tokens.length === 0) {
      setSelectedTokenId(null);
    } else if (!selectedTokenId || !tokens.some((token) => token.id === selectedTokenId)) {
      // 列表按 created_at desc 排列，首个可能是刚吊销的 Token：
      // 优先选第一个活跃 Token，没有活跃 Token 才回退列表首个。
      const fallback = tokens.find((token) => token.status === 'active') ?? tokens[0];
      setSelectedTokenId(fallback.id);
    }
  }, [selectedTokenId, tokens, tokensData]);

  useEffect(() => {
    // 末页最后一个 token 被撤销后列表为空：回退一页，
    // 避免卡在没有 PaginationControls 的空态。
    if (tokensData !== undefined && tokens.length === 0 && tokenOffset > 0) {
      setTokenOffset((current) => Math.max(0, current - TOKEN_PAGE_SIZE));
    }
  }, [tokens, tokensData, tokenOffset]);

  useEffect(() => {
    if (!grantsDirty) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    // Next.js 客户端导航不会触发 beforeunload：在捕获阶段拦截同源链接点击，
    // 弹出与切换 Token / 翻页一致的放弃确认。
    const interceptNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || (anchor.target && anchor.target !== '_self')) {
        return;
      }
      if (anchor.hasAttribute('download')) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }
      // 指向当前页（完全相同或仅 hash 不同）的链接不会离开页面，不拦截
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      setPendingWorkspaceChange({
        kind: 'navigate',
        href: `${url.pathname}${url.search}${url.hash}`,
      });
    };
    // 浏览器前进/后退哨兵：dirty 期间压入同 URL 哨兵条目，popstate 时
    // 立即重新覆盖（用户视觉上未离开）并弹出与链接拦截一致的放弃确认。
    // 哨兵与页面同 URL，不可见；确认离开走 history.go(-2) 跳过它，不会留下幻影条目。
    window.history.pushState({ __vgGuard: true }, '');
    const handlePopState = () => {
      if (historyBypassRef.current) {
        return;
      }
      window.history.pushState({ __vgGuard: true }, '');
      setPendingWorkspaceChange({ kind: 'history' });
    };
    document.addEventListener('click', interceptNavigation, true);
    window.addEventListener('beforeunload', warnBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('click', interceptNavigation, true);
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
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

  function applyWorkspaceChange(change: WorkspaceChange) {
    setGrantsDirty(false);
    if (change.kind === 'token') {
      setSelectedTokenId(change.tokenId);
    } else if (change.kind === 'page') {
      setTokenOffset(change.offset);
    } else if (change.kind === 'history') {
      // 浏览器前进/后退确认离开：放行并跳过哨兵与本页两条记录
      historyBypassRef.current = true;
      window.history.go(-2);
    } else {
      // dirty 期间栈顶是同 URL 哨兵：replace 覆盖它，避免留下指向本页的幻影条目
      router.replace(change.href);
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
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-6">
        <Link
          href="/agents"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <Badge variant={agent.status === 'active' ? 'success' : 'secondary'}>
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

      {actionError && <InlineAlert>{actionError}</InlineAlert>}
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

      <section aria-labelledby="issue-token-heading" className="border-b pb-6">
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
          {agent.status !== 'active' && (
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              {t('agents.issueTokenDisabledAgent')}
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
          <Button
            type="submit"
            loading={saving}
            disabled={grantsDirty || agent.status !== 'active'}
            leftIcon={<KeyRound />}
          >
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
