'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, RotateCcw, ShieldOff } from 'lucide-react';
import {
  issueToken,
  revokeToken,
  rotateToken,
  saveGrants,
  setAgentStatus,
  useAgent,
  useTokenGrants,
} from '@/domains/agent';
import type { AgentToken, IssuedAgentToken } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useSecrets } from '@/domains/secret';

const SECRET_PAGE_SIZE = 25;

export default function AgentDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ agentId: string }>();
  const { agent, isLoading, error, refresh } = useAgent(params.agentId);
  const [tokenName, setTokenName] = useState('');
  const [issued, setIssued] = useState<IssuedAgentToken | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function createToken(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setSaving(true);
    try {
      setIssued(await issueToken(params.agentId, { name: tokenName.trim() }));
      setTokenName('');
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main id="main-content" className="p-8 text-muted-foreground">
        {t('common.loading')}
      </main>
    );
  }
  if (error || !agent) {
    return (
      <main id="main-content" className="p-8 text-destructive">
        {error?.message || t('agents.notFound')}
      </main>
    );
  }

  return (
    <main id="main-content" className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('agents.title')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{agent.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {agent.description || t('agents.noDescription')}
          </p>
        </div>
        <Button
          variant="secondary"
          loading={statusSaving}
          leftIcon={<ShieldOff className="h-4 w-4" />}
          onClick={async () => {
            setActionError(null);
            setStatusSaving(true);
            try {
              await setAgentStatus(agent.id, agent.status === 'active' ? 'disabled' : 'active');
              await refresh();
            } catch (caught) {
              setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
            } finally {
              setStatusSaving(false);
            }
          }}
        >
          {agent.status === 'active' ? t('agents.disable') : t('agents.enable')}
        </Button>
      </header>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {issued && <OneTimeToken token={issued} onDone={() => setIssued(null)} />}

      <Card className="p-5">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createToken}>
          <div className="flex-1 space-y-2">
            <Label htmlFor="token-name">{t('agents.tokenName')}</Label>
            <Input
              id="token-name"
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              required
            />
          </div>
          <Button type="submit" loading={saving} leftIcon={<KeyRound className="h-4 w-4" />}>
            {t('agents.issueToken')}
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('agents.tokens')}</h2>
        {agent.tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('agents.noTokens')}</p>
        ) : (
          agent.tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              agentId={agent.id}
              onIssued={setIssued}
              onChanged={refresh}
            />
          ))
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
      <code className="mt-3 block break-all rounded-md bg-background p-3 text-xs">
        {token.token}
      </code>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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

function TokenRow({
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
  const { t } = useI18n();
  const { secretIds, error: grantsError, isLoading: grantsLoading } = useTokenGrants(token.id);
  const [secretOffset, setSecretOffset] = useState(0);
  const {
    secrets,
    total: secretTotal,
    error: secretsError,
  } = useSecrets({
    limit: SECRET_PAGE_SIZE,
    offset: secretOffset,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<'rotate' | 'revoke' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => setSelected(secretIds), [secretIds]);
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{token.name}</h3>
            <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
              {token.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{token.key_prefix}…</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            loading={pendingAction === 'rotate'}
            disabled={pendingAction !== null}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={async () => {
              setActionError(null);
              setPendingAction('rotate');
              try {
                onIssued(await rotateToken(agentId, token.id));
                await onChanged();
              } catch (caught) {
                setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
              } finally {
                setPendingAction(null);
              }
            }}
          >
            {t('agents.rotate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pendingAction === 'revoke'}
            disabled={token.status !== 'active' || pendingAction !== null}
            onClick={async () => {
              setActionError(null);
              setPendingAction('revoke');
              try {
                await revokeToken(agentId, token.id);
                await onChanged();
              } catch (caught) {
                setActionError(caught instanceof Error ? caught.message : t('agents.actionFailed'));
              } finally {
                setPendingAction(null);
              }
            }}
          >
            {t('agents.revoke')}
          </Button>
        </div>
      </div>
      {actionError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actionError}
        </p>
      )}
      <fieldset className="mt-5 border-t pt-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('agents.secretAccess')}
        </legend>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          {secrets.map((secret) => (
            <label key={secret.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(secret.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, secret.id]
                      : current.filter((id) => id !== secret.id)
                  )
                }
              />
              <span>{secret.name}</span>
            </label>
          ))}
        </div>
        {secretsError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {secretsError.message}
          </p>
        )}
        {grantsError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {grantsError.message}
          </p>
        )}
        <PaginationControls
          offset={secretOffset}
          limit={SECRET_PAGE_SIZE}
          total={secretTotal}
          onOffsetChange={setSecretOffset}
        />
        <Button
          className="mt-4"
          size="sm"
          loading={saving}
          disabled={grantsLoading || Boolean(grantsError)}
          onClick={async () => {
            setActionError(null);
            setSaved(false);
            setSaving(true);
            try {
              await saveGrants(token.id, selected);
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
          <p role="status" className="mt-2 text-sm text-status-success">
            {t('agents.accessSaved')}
          </p>
        )}
      </fieldset>
    </Card>
  );
}
