'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { createAgent, useAgents } from '@/domains/agent';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';

const PAGE_SIZE = 25;

export default function AgentsPage() {
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const { agents, total, isLoading, error, refresh } = useAgents({
    limit: PAGE_SIZE,
    offset,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createAgent({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      setShowCreate(false);
      setOffset(0);
      await refresh();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : t('agents.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            VaultGate
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t('agents.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('agents.description')}</p>
          <p className="mt-3 text-xs tabular-nums text-muted-foreground">
            {t('agents.resultCount', { count: total })}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate((value) => !value)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {t('agents.new')}
        </Button>
      </header>

      {showCreate && (
        <Card className="max-w-2xl p-5">
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="agent-name">{t('agents.name')}</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">{t('agents.agentDescription')}</Label>
              <Input
                id="agent-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {t('common.create')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3 border-y py-4" aria-label={t('common.loading')}>
          <div className="h-16 animate-pulse rounded-md bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : agents.length === 0 ? (
        <EmptyState
          title={t('agents.empty')}
          description={t('agents.emptyDescription')}
          icon={<Bot className="h-6 w-6" />}
          action={
            <Button leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
              {t('agents.new')}
            </Button>
          }
          className="border-y"
        />
      ) : (
        <div className="divide-y border-y">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="hover:bg-accent/40 group grid gap-2 px-2 py-5 transition-colors sm:grid-cols-[1fr_auto] sm:px-3"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${agent.status === 'active' ? 'bg-status-success' : 'bg-muted-foreground'}`}
                    aria-hidden="true"
                  />
                  <h2 className="font-medium group-hover:underline">{agent.name}</h2>
                </div>
                <p className="mt-1 pl-5 text-sm text-muted-foreground">
                  {agent.description || t('agents.noDescription')}
                </p>
              </div>
              <span className="self-center text-xs uppercase tracking-wider text-muted-foreground">
                {t(`agents.status.${agent.status}`)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <PaginationControls
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onOffsetChange={setOffset}
      />
    </main>
  );
}
