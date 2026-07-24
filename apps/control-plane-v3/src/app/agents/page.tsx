'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { createAgent, useAgents } from '@/domains/agent';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Skeleton } from '@/components/ui/skeleton';

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
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t('agents.title')}
          </h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('agents.resultCount', { count: total })}
          </span>
        </div>
        <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
          {t('agents.new')}
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3 border-y py-3" aria-label={t('common.loading')}>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <InlineAlert>{error.message}</InlineAlert>
      ) : agents.length === 0 ? (
        <EmptyState
          title={t('agents.empty')}
          icon={<Bot className="h-6 w-6" />}
          action={
            <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
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
              className="group flex min-w-0 items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${agent.status === 'active' ? 'bg-status-success' : 'bg-muted-foreground'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium group-hover:underline">{agent.name}</h2>
                {agent.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {agent.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
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

      <Dialog open={showCreate} onOpenChange={(open) => !saving && setShowCreate(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('agents.new')}</DialogTitle>
            <DialogDescription>{t('agents.description')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="agent-name">{t('agents.name')}</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">{t('agents.agentDescription')}</Label>
              <Input
                id="agent-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
              />
            </div>
            {formError && <InlineAlert>{formError}</InlineAlert>}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
