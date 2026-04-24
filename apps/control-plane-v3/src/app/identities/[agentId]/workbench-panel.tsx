'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import type { OpenClawAgent, WorkbenchSessionSummary } from '@/domains/identity';
import {
  useWorkbenchMessages,
  useSendWorkbenchMessage,
  useCreateAgentWorkbenchSession,
  refreshAgentWorkbenchSessions,
} from '@/domains/identity';
import { useCapabilities } from '@/domains/governance';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { useI18n } from '@/components/i18n-provider';
import { formatSnapshotTimestamp } from '../components';

export interface WorkbenchPanelProps {
  agent: OpenClawAgent;
  workbenchSessions: WorkbenchSessionSummary[];
  isLoadingSessions: boolean;
  sessionsError: string | null;
}

export function WorkbenchPanel({
  agent,
  workbenchSessions,
  isLoadingSessions,
  sessionsError,
}: WorkbenchPanelProps) {
  const { t } = useI18n();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    workbenchSessions[0]?.id ?? null
  );
  const [composerValue, setComposerValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useWorkbenchMessages(selectedConversationId);
  const sendMessage = useSendWorkbenchMessage();
  const createSession = useCreateAgentWorkbenchSession();
  const capabilitiesQuery = useCapabilities();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string>('');

  const messages = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data]);
  const availableCapabilities = useMemo(() => {
    const allowedIds = new Set(agent.allowed_capability_ids ?? []);
    return (capabilitiesQuery.data?.items ?? []).filter((capability) => {
      if (capability.publication_status !== 'active' || capability.adapter_type !== 'openai') {
        return false;
      }
      return allowedIds.size === 0 || allowedIds.has(capability.id);
    });
  }, [agent.allowed_capability_ids, capabilitiesQuery.data?.items]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedConversationId && workbenchSessions.length > 0) {
      setSelectedConversationId(workbenchSessions[0].id);
    }
  }, [workbenchSessions, selectedConversationId]);

  useEffect(() => {
    if (!selectedCapabilityId && availableCapabilities.length > 0) {
      setSelectedCapabilityId(availableCapabilities[0].id);
    }
  }, [availableCapabilities, selectedCapabilityId]);

  async function handleSend() {
    if (!composerValue.trim() || !selectedConversationId) {
      return;
    }
    setIsSending(true);
    setSendError(null);
    try {
      await sendMessage(selectedConversationId, { content: composerValue.trim() });
      setComposerValue('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('identities.workbench.sendFailed'));
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateSession() {
    if (!newSessionName.trim() || !selectedCapabilityId) {
      return;
    }
    setIsCreatingSession(true);
    setSendError(null);
    try {
      const session = await createSession(agent.id, {
        capability_id: selectedCapabilityId,
        title: newSessionName.trim(),
      });
      setNewSessionName('');
      setShowNewSession(false);
      await refreshAgentWorkbenchSessions(agent.id);
      if (session.id) {
        setSelectedConversationId(session.id);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('identities.sessionManager.createFailed'));
    } finally {
      setIsCreatingSession(false);
    }
  }

  const selectedSession = workbenchSessions.find((s) => s.id === selectedConversationId) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Left rail - conversation history */}
      <div className="flex-shrink-0 lg:w-72">
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
                {t('identities.workbench.conversations')}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewSession((s) => !s)}
              >
                {t('identities.sessionManager.newSession')}
              </Button>
            </div>

            {showNewSession && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label
                    htmlFor="workbench-capability"
                    className="block text-sm font-medium text-[var(--kw-text)]"
                  >
                    {t('identities.workbench.capability')}
                  </label>
                  <select
                    id="workbench-capability"
                    value={selectedCapabilityId}
                    onChange={(e) => setSelectedCapabilityId(e.target.value)}
                    className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)]"
                  >
                    <option value="">{t('identities.workbench.selectCapability')}</option>
                    {availableCapabilities.map((capability) => (
                      <option key={capability.id} value={capability.id}>
                        {capability.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={t('identities.sessionManager.displayName')}
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder={t('identities.sessionManager.displayNamePlaceholder')}
                />
                {availableCapabilities.length === 0 ? (
                  <p className="text-sm text-[var(--kw-text-muted)]">
                    {t('identities.workbench.noCapabilities')}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewSession(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    loading={isCreatingSession}
                    onClick={handleCreateSession}
                    disabled={!newSessionName.trim() || !selectedCapabilityId}
                  >
                    {t('common.create')}
                  </Button>
                </div>
              </div>
            )}

            {isLoadingSessions ? (
              <div className="flex items-center gap-2 text-sm text-[var(--kw-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('identities.workbench.loadingConversations')}
              </div>
            ) : sessionsError ? (
              <div className="flex items-center gap-2 text-sm text-[var(--kw-error)]">
                <AlertTriangle className="h-4 w-4" />
                {sessionsError}
              </div>
            ) : workbenchSessions.length === 0 ? (
              <div className="text-sm text-[var(--kw-text-muted)]">
                {t('identities.workbench.noConversations')}
              </div>
            ) : (
              <div className="space-y-2">
                {workbenchSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedConversationId(session.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      selectedConversationId === session.id
                        ? 'border-[var(--kw-primary-400)] bg-[var(--kw-primary-50)] dark:border-[var(--kw-primary-400)] dark:bg-[var(--kw-primary-500)]/10'
                        : 'border-[var(--kw-border)] bg-white/70 hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-[var(--kw-text-muted)]" />
                      <span className="truncate text-sm font-medium text-[var(--kw-text)]">
                        {session.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {session.capability_name ? <Badge variant="secondary">{session.capability_name}</Badge> : null}
                      <span className="text-xs text-[var(--kw-text-muted)]">
                        {formatSnapshotTimestamp(session.last_message_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main panel */}
      <div className="flex min-h-[24rem] flex-1 flex-col lg:min-h-[32rem]">
        <Card className="flex flex-1 flex-col overflow-hidden dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--kw-border)] px-4 py-3 dark:border-[var(--kw-dark-border)]">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {selectedSession?.title ?? t('identities.workbench.selectConversation')}
              </p>
              {selectedSession ? (
                <p className="truncate text-xs text-[var(--kw-text-muted)]">
                  {agent.name}
                  {selectedSession.capability_name ? ` · ${selectedSession.capability_name}` : ''}
                </p>
              ) : (
                <p className="truncate text-xs text-[var(--kw-text-muted)]">
                  {agent.name}
                </p>
              )}
            </div>
            {selectedSession && (
              <Badge variant={selectedSession.status === 'active' ? 'success' : 'secondary'}>
                {selectedSession.status}
              </Badge>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!selectedConversationId ? (
              <EmptyState message={t('identities.workbench.selectConversation')} />
            ) : messagesQuery.isLoading ? (
              <LoadingState message={t('identities.workbench.loadingMessages')} />
            ) : messagesQuery.error instanceof Error ? (
              <ErrorState message={messagesQuery.error.message} />
            ) : messages.length === 0 ? (
              <EmptyState message={t('identities.workbench.noMessages')} />
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white'
                          : 'border border-[var(--kw-border)] bg-[var(--kw-surface-alt)] text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-dark-text)]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-[var(--kw-text-muted)]'}`}>
                        {formatSnapshotTimestamp(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          {selectedConversationId && (
            <div className="border-t border-[var(--kw-border)] px-4 py-3 dark:border-[var(--kw-dark-border)]">
              {sendError && (
                <div className="mb-2 rounded-xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 px-3 py-2 text-xs text-[var(--kw-rose-text)]">
                  {sendError}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t('identities.workbench.composerPlaceholder')}
                    rows={2}
                    className="w-full resize-none rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)]"
                  />
                </div>
                <Button
                  size="sm"
                  loading={isSending}
                  onClick={handleSend}
                  disabled={!composerValue.trim()}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  {t('identities.workbench.send')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
        <MessageSquare className="h-5 w-5" />
      </div>
      <p className="text-sm text-[var(--kw-text-muted)]">{message}</p>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--kw-primary-400)]" />
      <p className="text-sm text-[var(--kw-text-muted)]">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-[var(--kw-error)]" />
      <p className="text-sm text-[var(--kw-error)]">{message}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl p-4 sm:p-5 ${className ?? ''}`}>
      {children}
    </div>
  );
}
