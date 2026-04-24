'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  useCreateOpenClawSession,
  useRevokeOpenClawSession,
  refreshOpenClawSessions,
} from '@/domains/identity';
import type { OpenClawAgent, OpenClawSession } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { useI18n } from '@/components/i18n-provider';
import { formatSnapshotTimestamp } from './components';

export interface SessionManagerProps {
  agent: OpenClawAgent;
  sessions: OpenClawSession[];
  sessionErrorMessage: string | null;
  canManage: boolean;
}

export function SessionManager({ agent, sessions, sessionErrorMessage, canManage }: SessionManagerProps) {
  const { t } = useI18n();
  const createSession = useCreateOpenClawSession();
  const revokeSession = useRevokeOpenClawSession();
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    session_key: '',
    display_name: '',
    channel: 'chat',
    subject: '',
  });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  async function handleCreate() {
    if (!createForm.session_key.trim() || !createForm.display_name.trim()) {
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await createSession(agent.id, {
        session_key: createForm.session_key.trim(),
        display_name: createForm.display_name.trim(),
        channel: createForm.channel || 'chat',
        subject: createForm.subject.trim() || undefined,
      });
      setCreateForm({ session_key: '', display_name: '', channel: 'chat', subject: '' });
      setShowCreate(false);
      await refreshOpenClawSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('identities.sessionManager.createFailed'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId);
    setError(null);
    try {
      await revokeSession(sessionId);
      await refreshOpenClawSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('identities.sessionManager.revokeFailed'));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
          {t('identities.sessionManager.title')}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="info">{sortedSessions.length}</Badge>
          {canManage ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate((s) => !s)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('identities.sessionManager.newSession')}
            </Button>
          ) : null}
        </div>
      </div>

      {sessionErrorMessage ? (
        <p className="text-sm text-[var(--kw-error)]">
          {t('identities.sections.sessionHistoryUnavailable', { message: sessionErrorMessage })}
        </p>
      ) : null}

      {showCreate && canManage ? (
        <div className="space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80">
          <Input
            label={t('identities.sessionManager.sessionKey')}
            value={createForm.session_key}
            onChange={(e) => setCreateForm((f) => ({ ...f, session_key: e.target.value }))}
            placeholder={t('identities.sessionManager.sessionKeyPlaceholder')}
          />
          <Input
            label={t('identities.sessionManager.displayName')}
            value={createForm.display_name}
            onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder={t('identities.sessionManager.displayNamePlaceholder')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('identities.sessionManager.channel')}
              value={createForm.channel}
              onChange={(e) => setCreateForm((f) => ({ ...f, channel: e.target.value }))}
              placeholder="workbench"
            />
            <Input
              label={t('identities.sessionManager.subject')}
              value={createForm.subject}
              onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={t('identities.sessionManager.subjectPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={isCreating} onClick={handleCreate}>
              {t('common.create')}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 p-3 text-sm text-[var(--kw-rose-text)]">
          {error}
        </div>
      ) : null}

      {sortedSessions.length === 0 ? (
        <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.sections.noRecentSessions')}</p>
      ) : (
        <div className="space-y-2">
          {sortedSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--kw-text)]">{session.display_name}</p>
                <p className="mt-1 break-all text-xs text-[var(--kw-text-muted)]">{session.id}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{session.channel}</Badge>
                </div>
                {session.session_key ? (
                  <p className="mt-1 break-all text-xs text-[var(--kw-text-muted)]">
                    {t('identities.sessionManager.sessionKey')}: {session.session_key}
                  </p>
                ) : null}
                {session.subject ? (
                  <p className="mt-1 text-xs text-[var(--kw-text-muted)]">{session.subject}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                  {t('identities.sections.updatedAt', { value: formatSnapshotTimestamp(session.updated_at) })}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={revokingId === session.id}
                  onClick={() => handleRevoke(session.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  className="text-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)]"
                >
                  {t('identities.sessionManager.revoke')}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
