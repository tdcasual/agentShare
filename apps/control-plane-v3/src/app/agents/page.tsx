'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import {
  approveJoinRequest,
  createAgent,
  createAgentInvite,
  rejectJoinRequest,
  useAgentJoinRequests,
  useAgents,
} from '@/domains/agent';
import { useSpaces } from '@/domains/space';
import type { AgentJoinRequest } from '@/lib/vaultgate-api';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const { spaces } = useSpaces();
  const { requests, refresh: refreshRequests } = useAgentJoinRequests();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteSpaceId, setInviteSpaceId] = useState('none');
  const [inviteRole, setInviteRole] = useState<'reader' | 'contributor' | 'maintainer'>('reader');
  const [invitePrompt, setInvitePrompt] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    setInviteSaving(true);
    setInviteError(null);
    try {
      const created = await createAgentInvite({
        label: inviteLabel.trim(),
        role: inviteRole,
        ...(inviteSpaceId !== 'none' ? { space_id: inviteSpaceId } : {}),
      });
      const endpoint = `${window.location.origin}/api/onboarding/v1/requests`;
      setInvitePrompt(
        `VaultGate Agent onboarding v1\n\n1. Submit a join request (run once):\n\ncurl -sS -X POST '${endpoint}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Idempotency-Key: <unique-request-key>' \\\n  --data-raw '{"invite_code":"${created.code}","agent_name":"<your-agent-name>","description":"<optional-description>"}'\n\nSave the response's request_id and request_secret. Do not log or share either credential.\n\n2. Poll until approved:\n\ncurl -sS '${endpoint}/<request_id>' \\\n  -H 'Authorization: Bearer <request_secret>'\n\n3. Claim the initial Agent token after approval (run once):\n\ncurl -sS -X POST '${endpoint}/<request_id>/credential' \\\n  -H 'Authorization: Bearer <request_secret>' \\\n  -H 'Idempotency-Key: <unique-claim-key>'\n\nStore the returned vg_ token in your secret manager and use it as a Bearer token for /api/vault/* calls. Never print it.\n\nThe invite code is short-lived and one-time; keep it private and submit it only once.`
      );
    } catch (caught) {
      setInviteError(caught instanceof Error ? caught.message : t('agents.inviteFailed'));
    } finally {
      setInviteSaving(false);
    }
  }

  async function approve(request: AgentJoinRequest) {
    try {
      await approveJoinRequest(request, { token_name: 'onboarding' });
      await refreshRequests();
    } catch (caught) {
      setInviteError(caught instanceof Error ? caught.message : t('agents.approvalFailed'));
    }
  }

  async function reject(request: AgentJoinRequest) {
    try {
      await rejectJoinRequest(request);
      await refreshRequests();
    } catch (caught) {
      setInviteError(caught instanceof Error ? caught.message : t('agents.rejectionFailed'));
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
            {t('agents.invite')}
          </Button>
          <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
            {t('agents.new')}
          </Button>
        </div>
      </header>

      {requests.some((item) => item.status === 'pending') && (
        <section className="space-y-3 border-y py-4" aria-labelledby="agent-requests-heading">
          <h2 id="agent-requests-heading" className="text-sm font-semibold">
            {t('agents.requestsTitle')}
          </h2>
          {requests
            .filter((item) => item.status === 'pending')
            .map((request) => (
              <div key={request.id} className="flex flex-wrap items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{request.proposed_name}</p>
                  {request.description && (
                    <p className="truncate text-xs text-muted-foreground">{request.description}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => void approve(request)}>
                  {t('agents.approve')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void reject(request)}>
                  {t('agents.reject')}
                </Button>
              </div>
            ))}
        </section>
      )}

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

      <Dialog open={showInvite} onOpenChange={(open) => !inviteSaving && setShowInvite(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('agents.invite')}</DialogTitle>
            <DialogDescription>{t('agents.inviteDescription')}</DialogDescription>
          </DialogHeader>
          {!invitePrompt ? (
            <form className="space-y-4" onSubmit={submitInvite}>
              <div className="space-y-2">
                <Label htmlFor="invite-label">{t('agents.inviteLabel')}</Label>
                <Input
                  id="invite-label"
                  value={inviteLabel}
                  onChange={(event) => setInviteLabel(event.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-space">{t('agents.inviteSpace')}</Label>
                <Select value={inviteSpaceId} onValueChange={setInviteSpaceId}>
                  <SelectTrigger id="invite-space">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('agents.inviteNoSpace')}</SelectItem>
                    {spaces
                      .filter((space) => space.status === 'active')
                      .map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">{t('agents.inviteRole')}</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as typeof inviteRole)}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reader">{t('spaces.roles.reader')}</SelectItem>
                    <SelectItem value="contributor">{t('spaces.roles.contributor')}</SelectItem>
                    <SelectItem value="maintainer">{t('spaces.roles.maintainer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteError && <InlineAlert>{inviteError}</InlineAlert>}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowInvite(false)}
                  disabled={inviteSaving}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={inviteSaving}>
                  {t('agents.generateInvite')}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={invitePrompt}
                readOnly
                rows={9}
                aria-label={t('agents.invitePrompt')}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(invitePrompt)}
                >
                  {t('agents.copyPrompt')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setInvitePrompt(null);
                    setInviteLabel('');
                    setShowInvite(false);
                  }}
                >
                  {t('common.close')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
