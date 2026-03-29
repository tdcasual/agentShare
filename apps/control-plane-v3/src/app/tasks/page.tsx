'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, MessageSquarePlus, Plus, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { ApiError, api, type TaskCreateInput, type TokenFeedbackCreateInput } from '@/lib/api';
import { useManagementSessionGate } from '@/lib/session';
import type { AgentTokenSummary, RunSummary, TaskSummary, TokenFeedbackSummary } from '@/shared/types';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input, Textarea } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';

interface TaskTargetView {
  targetId: string;
  tokenId: string;
  token: AgentTokenSummary | null;
  run: RunSummary | null;
  feedback: TokenFeedbackSummary[];
  status: 'pending' | 'claimed' | 'completed';
}

interface FeedbackTargetState {
  taskId: string;
  taskTitle: string;
  targetId: string;
  tokenLabel: string;
}

export default function TasksPage() {
  return (
    <Layout>
      <TasksContent />
    </Layout>
  );
}

function TasksContent() {
  const { session, loading: gateLoading, error: gateError } = useManagementSessionGate();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [tokensById, setTokensById] = useState<Record<string, AgentTokenSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTargetState | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    task_type: 'account_read',
    priority: 'normal',
    target_mode: 'explicit_tokens' as 'explicit_tokens' | 'broadcast',
    target_token_ids: [] as string[],
    input_json: '{\n  "provider": "github"\n}',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    score: '5',
    verdict: 'accepted',
    summary: '',
  });
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [feedbackFormError, setFeedbackFormError] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackByTargetId, setFeedbackByTargetId] = useState<Record<string, TokenFeedbackSummary[]>>({});

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [taskItems, runItems, agentItems] = await Promise.all([
          api.getTasks(),
          api.getRuns(),
          api.getAgents(),
        ]);

        const tokenBatches = await Promise.all(
          agentItems.items.map(async (agent) => (await api.getAgentTokens(agent.id)).items)
        );
        const flatTokens = tokenBatches.flat();
        const tokenMap = Object.fromEntries(flatTokens.map((token) => [token.id, token]));
        const uniqueTargetTokenIds = Array.from(
          new Set(taskItems.items.flatMap((task) => task.target_token_ids))
        );
        const feedbackEntries = await Promise.all(
          uniqueTargetTokenIds.map(async (tokenId) => [tokenId, (await api.getTokenFeedback(tokenId)).items] as const)
        );
        const nextFeedbackByTargetId = feedbackEntries.reduce<Record<string, TokenFeedbackSummary[]>>(
          (accumulator, [, items]) => {
            items.forEach((item) => {
              accumulator[item.task_target_id] = [...(accumulator[item.task_target_id] ?? []), item];
            });
            return accumulator;
          },
          {}
        );

        if (cancelled) {
          return;
        }

        setTasks(taskItems.items);
        setRuns(runItems.items);
        setTokensById(tokenMap);
        setFeedbackByTargetId(nextFeedbackByTargetId);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load task dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce, session]);

  const allTokens = useMemo(() => Object.values(tokensById), [tokensById]);
  const taskViews = useMemo(
    () =>
      tasks.map((task) => ({
        task,
        targets: buildTaskTargets(task, tokensById, runs, feedbackByTargetId),
      })),
    [feedbackByTargetId, runs, tasks, tokensById]
  );

  const totalTargets = taskViews.reduce((total, item) => total + item.targets.length, 0);
  const completedTargets = taskViews.reduce(
    (total, item) => total + item.targets.filter((target) => target.status === 'completed').length,
    0
  );
  const totalFeedback = Object.values(feedbackByTargetId).reduce((total, items) => total + items.length, 0);
  const selectedTask = taskViews.find((item) => item.task.id === selectedTaskId) ?? null;

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTask(true);
    setTaskFormError(null);
    setError(null);

    try {
      const parsedInput = parseJsonObject(taskForm.input_json);
      if (taskForm.target_mode === 'explicit_tokens' && taskForm.target_token_ids.length === 0) {
        throw new Error('Choose at least one target token or switch to broadcast mode.');
      }

      const payload: TaskCreateInput = {
        title: taskForm.title.trim(),
        task_type: taskForm.task_type.trim(),
        priority: taskForm.priority,
        input: parsedInput,
        target_mode: taskForm.target_mode,
        target_token_ids: taskForm.target_mode === 'explicit_tokens' ? taskForm.target_token_ids : [],
      };
      await api.createTask(payload);
      setTaskForm({
        title: '',
        task_type: 'account_read',
        priority: 'normal',
        target_mode: 'explicit_tokens',
        target_token_ids: [],
        input_json: '{\n  "provider": "github"\n}',
      });
      setShowCreateTaskModal(false);
      setRefreshNonce((current) => current + 1);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setTaskFormError(submitError.detail);
      } else {
        setTaskFormError(submitError instanceof Error ? submitError.message : 'Failed to create task');
      }
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleSubmitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackTarget) {
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackFormError(null);
    setError(null);

    try {
      const payload: TokenFeedbackCreateInput = {
        score: Number(feedbackForm.score),
        verdict: feedbackForm.verdict.trim(),
        summary: feedbackForm.summary.trim(),
      };
      await api.createTaskTargetFeedback(feedbackTarget.targetId, payload);
      setFeedbackForm({ score: '5', verdict: 'accepted', summary: '' });
      setFeedbackTarget(null);
      setRefreshNonce((current) => current + 1);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFeedbackFormError(submitError.detail);
      } else {
        setFeedbackFormError(submitError instanceof Error ? submitError.message : 'Failed to save feedback');
      }
    } finally {
      setSubmittingFeedback(false);
    }
  }

  function toggleTargetToken(tokenId: string) {
    setTaskForm((current) => ({
      ...current,
      target_token_ids: current.target_token_ids.includes(tokenId)
        ? current.target_token_ids.filter((item) => item !== tokenId)
        : [...current.target_token_ids, tokenId],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-pink-700 border border-pink-100">
            <Target className="h-4 w-4" />
            Token-targeted delivery
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Task orchestration</h1>
            <p className="mt-1 text-gray-600">
              Publish work to specific runtime tokens, watch completion per token, and close the loop with feedback.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setRefreshNonce((current) => current + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Publish Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Published tasks" value={tasks.length.toString()} hint="currently visible active tasks" />
        <MetricCard label="Targeted tokens" value={totalTargets.toString()} hint="explicit token assignments" />
        <MetricCard label="Completed targets" value={completedTargets.toString()} hint="token-linked run records" />
        <MetricCard label="Feedback records" value={totalFeedback.toString()} hint="human review notes on finished work" />
      </div>

      {(gateError || error) && (
        <Card className="border border-red-100 bg-red-50/80 text-red-700">
          {gateError ?? error}
        </Card>
      )}

      {gateLoading || loading ? (
        <Card className="text-gray-600">Loading targeted tasks, token runs, and feedback...</Card>
      ) : null}

      {!gateLoading && !loading && taskViews.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-500">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800">No tasks published yet</h2>
            <p className="text-gray-600">Create a task and target it to one or more runtime tokens from this page.</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5">
        {taskViews.map(({ task, targets }) => {
          const feedbackItems = targets.flatMap((target) => target.feedback);
          const averageScore =
            feedbackItems.length > 0
              ? feedbackItems.reduce((total, item) => total + item.score, 0) / feedbackItems.length
              : null;

          return (
            <Card
              key={task.id}
              variant="kawaii"
              hover
              className="cursor-pointer space-y-4"
              onClick={() => setSelectedTaskId(task.id)}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                    <Badge variant={task.status === 'completed' ? 'success' : task.status === 'claimed' ? 'warning' : 'info'}>
                      {task.status}
                    </Badge>
                    <Badge variant={task.publication_status === 'active' ? 'primary' : 'warning'}>
                      {task.publication_status}
                    </Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">{task.title}</h2>
                    <p className="text-sm text-gray-500">
                      {task.task_type} • created by {task.created_by_actor_type}:{task.created_by_actor_id}
                    </p>
                  </div>
                </div>

                <div className="grid min-w-[220px] gap-2 rounded-3xl border border-pink-100 bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Feedback summary</p>
                  <p className="text-sm font-medium text-gray-800">
                    {feedbackItems.length > 0 ? `${feedbackItems.length} reviews • avg ${averageScore?.toFixed(1)}` : 'No feedback yet'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {targets.filter((target) => target.status === 'completed').length}/{targets.length} targets completed
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Target tokens</p>
                <div className="flex flex-wrap gap-2">
                  {targets.length === 0 ? (
                    <Badge variant="default">No token targets</Badge>
                  ) : (
                    targets.map((target) => (
                      <Badge key={target.targetId} variant={targetStatusVariant(target.status)} className="text-xs">
                        {target.token?.display_name ?? target.tokenId}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title="Publish task"
        description="Choose the concrete runtime tokens that should receive this work."
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleCreateTask}>
          <Input
            label="Title"
            value={taskForm.title}
            onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Sync staging provider config"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Task type"
              value={taskForm.task_type}
              onChange={(event) => setTaskForm((current) => ({ ...current, task_type: event.target.value }))}
              placeholder="config_sync"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={taskForm.priority}
                onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
          </div>

          <Textarea
            label="Input payload (JSON)"
            value={taskForm.input_json}
            onChange={(event) => setTaskForm((current) => ({ ...current, input_json: event.target.value }))}
            className="min-h-[180px] font-mono text-sm"
          />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Target mode</p>
              <p className="text-sm text-gray-500">Explicit targets let you see completion by token directly.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setTaskForm((current) => ({ ...current, target_mode: 'explicit_tokens' }))}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  taskForm.target_mode === 'explicit_tokens'
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-pink-100 bg-white'
                }`}
              >
                <p className="font-medium text-gray-800">Explicit tokens</p>
                <p className="mt-1 text-sm text-gray-500">Send only to chosen tokens.</p>
              </button>
              <button
                type="button"
                onClick={() => setTaskForm((current) => ({ ...current, target_mode: 'broadcast', target_token_ids: [] }))}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  taskForm.target_mode === 'broadcast'
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-pink-100 bg-white'
                }`}
              >
                <p className="font-medium text-gray-800">Broadcast</p>
                <p className="mt-1 text-sm text-gray-500">Snapshot all active tokens at publish time.</p>
              </button>
            </div>
          </div>

          {taskForm.target_mode === 'explicit_tokens' ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Target tokens</p>
                <p className="text-sm text-gray-500">Choose one or more managed tokens.</p>
              </div>
              <div className="grid max-h-64 gap-3 overflow-y-auto rounded-3xl border border-pink-100 bg-pink-50/30 p-4">
                {allTokens.length === 0 ? (
                  <p className="text-sm text-gray-500">No managed tokens available yet. Create one from the Tokens page first.</p>
                ) : (
                  allTokens.map((token) => (
                    <label
                      key={token.id}
                      className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={taskForm.target_token_ids.includes(token.id)}
                        onChange={() => toggleTargetToken(token.id)}
                      />
                      <div>
                        <p className="font-medium text-gray-800">{token.display_name}</p>
                        <p className="text-sm text-gray-500">
                          {token.id} • {token.agent_id} • trust {token.trust_score.toFixed(2)}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {taskFormError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {taskFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTaskModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingTask}>
              Publish Task
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask?.task.title}
        description={selectedTask ? `${selectedTask.task.task_type} • ${selectedTask.task.id}` : undefined}
        size="xl"
      >
        {selectedTask ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant(selectedTask.task.priority)}>{selectedTask.task.priority}</Badge>
              <Badge
                variant={
                  selectedTask.task.status === 'completed'
                    ? 'success'
                    : selectedTask.task.status === 'claimed'
                      ? 'warning'
                      : 'info'
                }
              >
                {selectedTask.task.status}
              </Badge>
              <Badge variant={selectedTask.task.publication_status === 'active' ? 'primary' : 'warning'}>
                {selectedTask.task.publication_status}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="space-y-3 border border-pink-100 bg-white/90">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Input payload</p>
                <pre className="overflow-x-auto rounded-2xl bg-gray-900 px-4 py-4 text-sm text-pink-50">
                  {JSON.stringify(selectedTask.task.input ?? {}, null, 2)}
                </pre>
              </Card>

              <Card className="space-y-3 border border-pink-100 bg-white/90">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Publishing context</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>Actor: {selectedTask.task.created_by_actor_type}:{selectedTask.task.created_by_actor_id}</p>
                  <p>Via token: {selectedTask.task.created_via_token_id ?? 'Direct human publish'}</p>
                  <p>Claimed by agent: {selectedTask.task.claimed_by ?? 'Not currently claimed'}</p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Per-token status</h3>
                <p className="text-sm text-gray-500">
                  {selectedTask.targets.filter((target) => target.status === 'completed').length}/{selectedTask.targets.length} completed
                </p>
              </div>

              <div className="grid gap-3">
                {selectedTask.targets.map((target) => (
                  <Card key={target.targetId} className="space-y-4 border border-pink-100 bg-pink-50/30">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={targetStatusVariant(target.status)}>{target.status}</Badge>
                          <Badge variant="secondary">{target.token?.display_name ?? target.tokenId}</Badge>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{target.token?.token_prefix ?? target.tokenId}</p>
                          <p className="text-sm text-gray-500">
                            Agent {target.token?.agent_id ?? 'unknown'} • target {target.targetId}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFeedbackForm({ score: '5', verdict: 'accepted', summary: '' });
                          setFeedbackFormError(null);
                          setFeedbackTarget({
                            taskId: selectedTask.task.id,
                            taskTitle: selectedTask.task.title,
                            targetId: target.targetId,
                            tokenLabel: target.token?.display_name ?? target.tokenId,
                          });
                        }}
                        disabled={target.run === null}
                      >
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Leave feedback
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailStat
                        label="Run result"
                        value={target.run?.result_summary ?? (target.status === 'pending' ? 'Waiting to run' : 'Claimed, not completed')}
                      />
                      <DetailStat
                        label="Token trust"
                        value={target.token ? target.token.trust_score.toFixed(2) : 'Unknown'}
                      />
                      <DetailStat
                        label="Feedback count"
                        value={target.feedback.length.toString()}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {target.feedback.length === 0 ? (
                        <Badge variant="default">No feedback yet</Badge>
                      ) : (
                        target.feedback.map((item) => (
                          <Badge key={item.id} variant={item.verdict === 'accepted' ? 'success' : 'warning'} className="text-xs">
                            {item.verdict} • {item.score}/5
                          </Badge>
                        ))
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={feedbackTarget !== null}
        onClose={() => setFeedbackTarget(null)}
        title={feedbackTarget ? `Feedback for ${feedbackTarget.tokenLabel}` : 'Feedback'}
        description={feedbackTarget ? `${feedbackTarget.taskTitle} • ${feedbackTarget.targetId}` : undefined}
      >
        <form className="space-y-4" onSubmit={handleSubmitFeedback}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Score</label>
              <select
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={feedbackForm.score}
                onChange={(event) => setFeedbackForm((current) => ({ ...current, score: event.target.value }))}
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <Input
              label="Verdict"
              value={feedbackForm.verdict}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, verdict: event.target.value }))}
              placeholder="accepted"
              required
            />
          </div>

          <Textarea
            label="Summary"
            value={feedbackForm.summary}
            onChange={(event) => setFeedbackForm((current) => ({ ...current, summary: event.target.value }))}
            className="min-h-[140px]"
            placeholder="Call out what went well, what should change, and whether this token should be trusted with similar work."
          />

          {feedbackFormError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {feedbackFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setFeedbackTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingFeedback}>
              Save feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{hint}</p>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function buildTaskTargets(
  task: TaskSummary,
  tokensById: Record<string, AgentTokenSummary>,
  runs: RunSummary[],
  feedbackByTargetId: Record<string, TokenFeedbackSummary[]>
): TaskTargetView[] {
  return task.target_token_ids.map((tokenId, index) => {
    const targetId = task.target_ids[index] ?? `${task.id}:${tokenId}`;
    const token = tokensById[tokenId] ?? null;
    const run =
      runs.find((item) => item.task_target_id === targetId) ??
      runs.find((item) => item.task_id === task.id && item.token_id === tokenId) ??
      null;

    let status: TaskTargetView['status'] = 'pending';
    if (run) {
      status = 'completed';
    } else if (task.status === 'claimed' && task.claimed_by && token?.agent_id === task.claimed_by) {
      status = 'claimed';
    }

    return {
      targetId,
      tokenId,
      token,
      run,
      feedback: feedbackByTargetId[targetId] ?? [],
      status,
    };
  });
}

function parseJsonObject(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Input payload must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function priorityVariant(priority: string) {
  switch (priority) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'low':
      return 'default';
    default:
      return 'info';
  }
}

function targetStatusVariant(status: TaskTargetView['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'claimed':
      return 'warning';
    default:
      return 'default';
  }
}
