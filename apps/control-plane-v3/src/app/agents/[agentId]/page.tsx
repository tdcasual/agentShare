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
import { useSecrets } from '@/domains/secret';
import type { AgentToken, IssuedAgentToken, Secret } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AgentDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ agentId: string }>();
  const { agent, isLoading, error, refresh } = useAgent(params.agentId);
  const { secrets } = useSecrets();
  const [tokenName, setTokenName] = useState('');
  const [issued, setIssued] = useState<IssuedAgentToken | null>(null);
  const [saving, setSaving] = useState(false);

  async function createToken(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      setIssued(await issueToken(params.agentId, { name: tokenName.trim() }));
      setTokenName('');
      await refresh();
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
          leftIcon={<ShieldOff className="h-4 w-4" />}
          onClick={async () => {
            await setAgentStatus(agent.id, agent.status === 'active' ? 'disabled' : 'active');
            await refresh();
          }}
        >
          {agent.status === 'active' ? t('agents.disable') : t('agents.enable')}
        </Button>
      </header>

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
              secrets={secrets}
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
            await navigator.clipboard.writeText(token.token);
            setCopied(true);
          }}
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          {t('common.done')}
        </Button>
      </div>
    </Callout>
  );
}

function TokenRow({
  token,
  agentId,
  secrets,
  onIssued,
  onChanged,
}: {
  token: AgentToken;
  agentId: string;
  secrets: Secret[];
  onIssued: (token: IssuedAgentToken) => void;
  onChanged: () => void | Promise<unknown>;
}) {
  const { t } = useI18n();
  const { secretIds } = useTokenGrants(token.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
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
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={async () => {
              onIssued(await rotateToken(agentId, token.id));
              await onChanged();
            }}
          >
            {t('agents.rotate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={token.status !== 'active'}
            onClick={async () => {
              await revokeToken(agentId, token.id);
              await onChanged();
            }}
          >
            {t('agents.revoke')}
          </Button>
        </div>
      </div>
      <fieldset className="mt-5 border-t pt-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('agents.secretAccess')}
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {secrets.map((secret) => (
            <label key={secret.id} className="flex items-center gap-2 text-sm">
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
        <Button
          className="mt-4"
          size="sm"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await saveGrants(token.id, selected);
            } finally {
              setSaving(false);
            }
          }}
        >
          {t('agents.saveAccess')}
        </Button>
      </fieldset>
    </Card>
  );
}
