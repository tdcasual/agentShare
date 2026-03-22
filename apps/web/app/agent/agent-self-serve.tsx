"use client";

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "../../lib/i18n-shared";
import { tr } from "../../lib/i18n-shared";

type AgentIdentity = {
  id: string;
  name: string;
  risk_tier: string;
  allowed_task_types: string[];
  allowed_capability_ids: string[];
};

type TaskRecord = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  input: Record<string, unknown>;
  required_capability_ids: string[];
  playbook_ids: string[];
  lease_allowed: boolean;
  approval_mode: string;
  priority: string;
  claimed_by: string | null;
};

type McpToolCallResult = {
  result?: unknown;
  error?: unknown;
};

type AgentHttpResult = {
  status: number;
  bodyText: string;
  json: unknown | null;
};

type McpToolEnvelope = {
  jsonrpc?: string;
  id?: number | string | null;
  result?: {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
  };
  error?: unknown;
};

function safeJsonParse(value: string) {
  try {
    return { ok: true as const, value: JSON.parse(value) as unknown };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

async function agentFetchJson(
  path: string,
  init: RequestInit & { agentKey?: string } = {},
): Promise<AgentHttpResult> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (init.agentKey) {
    headers.set("authorization", `Bearer ${init.agentKey}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  const bodyText = await response.text();
  try {
    return {
      status: response.status,
      bodyText,
      json: bodyText ? (JSON.parse(bodyText) as unknown) : null,
    };
  } catch {
    return {
      status: response.status,
      bodyText,
      json: null,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function formatApiError(locale: Locale, action: string, response: AgentHttpResult): string {
  const payload = asRecord(response.json);
  const detail = payload?.detail;
  if (typeof detail === "string") {
    return `${action}${tr(locale, " failed", "失败")} (${response.status}): ${detail}`;
  }
  const detailObj = asRecord(detail);
  const code = typeof detailObj?.code === "string" ? detailObj.code : null;

  if (code === "approval_required") {
    const approvalId =
      typeof detailObj?.approval_request_id === "string" ? detailObj.approval_request_id : "";
    const policyReason =
      typeof detailObj?.policy_reason === "string" ? detailObj.policy_reason : "";
    return [
      tr(locale, `${action} blocked: approval required.`, `${action}被阻止：需要审批。`),
      approvalId ? tr(locale, `Request: ${approvalId}.`, `请求：${approvalId}。`) : null,
      policyReason ? tr(locale, `Policy: ${policyReason}.`, `策略：${policyReason}。`) : null,
      tr(locale, "Ask an operator to approve it in /approvals, then retry.", "请让运营者在 /approvals 审批后重试。"),
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (code === "policy_denied") {
    const policyReason =
      typeof detailObj?.policy_reason === "string" ? detailObj.policy_reason : "";
    const policySource =
      typeof detailObj?.policy_source === "string" ? detailObj.policy_source : "";
    const policyLine = policyReason || "Policy denied.";
    return tr(
      locale,
      `${action} denied by policy: ${policyLine}${policySource ? ` (${policySource})` : ""}`,
      `${action}被策略拒绝：${policyLine}${policySource ? `（${policySource}）` : ""}`,
    );
  }

  if (response.status === 401) {
    return tr(
      locale,
      `${action} failed: missing, unknown, or revoked agent key.`,
      `${action}失败：agent key 缺失、未知或已吊销。`,
    );
  }

  if (typeof response.bodyText === "string" && response.bodyText.trim()) {
    return tr(
      locale,
      `${action} failed (${response.status}): ${response.bodyText}`,
      `${action}失败（${response.status}）：${response.bodyText}`,
    );
  }
  return tr(locale, `${action} failed (${response.status}).`, `${action}失败（${response.status}）。`);
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function statusTone(status: string) {
  if (status === "completed") return "success";
  if (status === "pending") return "accent";
  return "muted";
}

function truncId(value: string, keep = 14) {
  if (value.length <= keep * 2 + 1) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

export function AgentSelfServe({ apiBaseUrl, locale }: { apiBaseUrl: string; locale: Locale }) {
  const [agentKey, setAgentKey] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<"pending" | "claimed" | "completed" | "all">("pending");
  const [onlyEligible, setOnlyEligible] = useState(true);

  const [playbookQuery, setPlaybookQuery] = useState("");
  const [playbookTaskType, setPlaybookTaskType] = useState("");
  const [playbookTag, setPlaybookTag] = useState("");
  const [playbookResult, setPlaybookResult] = useState<unknown | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [playbookCopied, setPlaybookCopied] = useState(false);

  const [invokeCapabilityId, setInvokeCapabilityId] = useState("");
  const [invokeParams, setInvokeParams] = useState('{"prompt":"hello"}');
  const [invokeResult, setInvokeResult] = useState<{ status: number; json: unknown | null; bodyText: string } | null>(
    null,
  );
  const [invokeError, setInvokeError] = useState<string | null>(null);

  const [leaseCapabilityId, setLeaseCapabilityId] = useState("");
  const [leasePurpose, setLeasePurpose] = useState("cli access");
  const [leaseResult, setLeaseResult] = useState<{ status: number; json: unknown | null; bodyText: string } | null>(
    null,
  );
  const [leaseError, setLeaseError] = useState<string | null>(null);

  const [completeResultSummary, setCompleteResultSummary] = useState("Completed via agent self-serve.");
  const [completeOutput, setCompleteOutput] = useState('{"ok":true}');
  const [completeResult, setCompleteResult] = useState<{ status: number; json: unknown | null; bodyText: string } | null>(
    null,
  );
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("acp_agent_key") ?? "";
    if (stored) {
      setAgentKey(stored);
    }
  }, []);

  useEffect(() => {
    if (!agentKey) return;
    window.sessionStorage.setItem("acp_agent_key", agentKey);
  }, [agentKey]);

  const canAuth = agentKey.trim().length > 0;
  const apiHint = apiBaseUrl || tr(locale, "Set AGENT_CONTROL_PLANE_API_URL on the web server.", "请在 Web 服务端设置 AGENT_CONTROL_PLANE_API_URL。");

  const eligibility = useMemo(() => {
    const identity = agentIdentity;
    if (!identity) return null;

    const allowedTaskTypes = new Set(identity.allowed_task_types ?? []);
    const allowedCapabilities = new Set(identity.allowed_capability_ids ?? []);
    return {
      isEligible: (task: TaskRecord) => {
        const okTaskType = allowedTaskTypes.size === 0 ? true : allowedTaskTypes.has(task.task_type);
        const okCapabilities = (task.required_capability_ids ?? []).every((id) => allowedCapabilities.has(id));
        return okTaskType && okCapabilities;
      },
    };
  }, [agentIdentity]);

  const suggestedCapabilityId = useMemo(() => {
    if (!activeTask) return "";
    return activeTask.required_capability_ids[0] ?? "";
  }, [activeTask]);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
      if (onlyEligible && eligibility && !eligibility.isEligible(task)) return false;
      return true;
    });
    return filtered;
  }, [tasks, taskStatusFilter, onlyEligible, eligibility]);

  async function verifyAgent() {
    setAgentError(null);
    setAgentIdentity(null);
    if (!canAuth) {
      setAgentError(tr(locale, "Paste an agent API key first.", "请先粘贴 agent API key。"));
      return;
    }

    const response = await agentFetchJson("/api/agent/agents/me", { agentKey });
    if (response.status !== 200) {
      setAgentError(formatApiError(locale, tr(locale, "Verify", "验证"), response));
      return;
    }
    setAgentIdentity(response.json as AgentIdentity);
  }

  async function loadTasks() {
    setTasksError(null);
    const response = await agentFetchJson("/api/agent/tasks");
    if (response.status !== 200) {
      setTasksError(formatApiError(locale, tr(locale, "Load tasks", "加载任务"), response));
      setTasks([]);
      return;
    }
    const payload = response.json as { items?: TaskRecord[] };
    setTasks(Array.isArray(payload?.items) ? payload.items : []);
  }

  async function claimTask(taskId: string) {
    setTasksError(null);
    if (!canAuth) {
      setTasksError(tr(locale, "Paste an agent API key to claim tasks.", "请粘贴 agent API key 后再认领任务。"));
      return;
    }
    const response = await agentFetchJson(`/api/agent/tasks/${taskId}/claim`, { method: "POST", agentKey });
    if (response.status !== 200) {
      setTasksError(formatApiError(locale, tr(locale, "Claim", "认领"), response));
      return;
    }
    setActiveTask(response.json as TaskRecord);
    await loadTasks();
  }

  async function searchPlaybooksViaMcp() {
    setPlaybookError(null);
    setPlaybookResult(null);
    if (!canAuth) {
      setPlaybookError(tr(locale, "Paste an agent API key to call MCP tools.", "请粘贴 agent API key 后再调用 MCP 工具。"));
      return;
    }

    const args: Record<string, string> = {};
    if (playbookQuery.trim()) args.q = playbookQuery.trim();
    if (playbookTaskType.trim()) args.task_type = playbookTaskType.trim();
    if (playbookTag.trim()) args.tag = playbookTag.trim();

    const response = await agentFetchJson("/api/agent/mcp", {
      method: "POST",
      agentKey,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_playbooks",
          arguments: args,
        },
      }),
    });

    if (response.status !== 200) {
      setPlaybookError(formatApiError(locale, tr(locale, "MCP call", "MCP 调用"), response));
      return;
    }

    const payload = response.json as McpToolEnvelope;
    const toolResult = payload?.result;
    if (toolResult?.isError) {
      setPlaybookError(
        tr(
          locale,
          `MCP tool returned an error: ${JSON.stringify(toolResult.structuredContent ?? toolResult)}`,
          `MCP 工具返回错误：${JSON.stringify(toolResult.structuredContent ?? toolResult)}`,
        ),
      );
      return;
    }
    setPlaybookResult(toolResult?.structuredContent ?? payload);
  }

  async function invokeCapability() {
    setInvokeError(null);
    setInvokeResult(null);
    if (!activeTask) {
      setInvokeError(tr(locale, "Claim or select a task first.", "请先认领或选择一个任务。"));
      return;
    }
    if (!canAuth) {
      setInvokeError(tr(locale, "Paste an agent API key first.", "请先粘贴 agent API key。"));
      return;
    }
    const capabilityId = (invokeCapabilityId || suggestedCapabilityId).trim();
    if (!capabilityId) {
      setInvokeError(tr(locale, "Enter a capability id.", "请输入 capability id。"));
      return;
    }
    const parsed = safeJsonParse(invokeParams);
    if (!parsed.ok) {
      setInvokeError(parsed.error);
      return;
    }
    const response = await agentFetchJson(`/api/agent/capabilities/${capabilityId}/invoke`, {
      method: "POST",
      agentKey,
      body: JSON.stringify({
        task_id: activeTask.id,
        parameters: parsed.value,
      }),
    });
    setInvokeResult(response);
    if (response.status !== 200) {
      setInvokeError(formatApiError(locale, tr(locale, "Invoke", "调用"), response));
    }
  }

  async function requestLease() {
    setLeaseError(null);
    setLeaseResult(null);
    if (!activeTask) {
      setLeaseError(tr(locale, "Claim or select a task first.", "请先认领或选择一个任务。"));
      return;
    }
    if (!canAuth) {
      setLeaseError(tr(locale, "Paste an agent API key first.", "请先粘贴 agent API key。"));
      return;
    }
    const capabilityId = (leaseCapabilityId || suggestedCapabilityId).trim();
    if (!capabilityId) {
      setLeaseError(tr(locale, "Enter a capability id.", "请输入 capability id。"));
      return;
    }
    const response = await agentFetchJson(`/api/agent/capabilities/${capabilityId}/lease`, {
      method: "POST",
      agentKey,
      body: JSON.stringify({
        task_id: activeTask.id,
        purpose: leasePurpose,
      }),
    });
    setLeaseResult(response);
    if (response.status !== 201) {
      setLeaseError(formatApiError(locale, tr(locale, "Lease", "租约"), response));
    }
  }

  async function completeTask() {
    setCompleteError(null);
    setCompleteResult(null);
    if (!activeTask) {
      setCompleteError(tr(locale, "Claim or select a task first.", "请先认领或选择一个任务。"));
      return;
    }
    if (!canAuth) {
      setCompleteError(tr(locale, "Paste an agent API key first.", "请先粘贴 agent API key。"));
      return;
    }
    const parsed = safeJsonParse(completeOutput);
    if (!parsed.ok) {
      setCompleteError(parsed.error);
      return;
    }
    const response = await agentFetchJson(`/api/agent/tasks/${activeTask.id}/complete`, {
      method: "POST",
      agentKey,
      body: JSON.stringify({
        result_summary: completeResultSummary,
        output_payload: parsed.value,
      }),
    });
    setCompleteResult(response);
    if (response.status !== 200) {
      setCompleteError(formatApiError(locale, tr(locale, "Complete", "完成"), response));
    }
    if (response.status === 200) {
      await loadTasks();
    }
  }

  function clearKey() {
    window.sessionStorage.removeItem("acp_agent_key");
    setAgentKey("");
    setAgentIdentity(null);
    setAgentError(null);
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const playbookItems = useMemo(() => {
    const structured = asRecord(playbookResult);
    const items = structured?.items;
    if (!Array.isArray(items)) return [];
    return items as Array<Record<string, unknown>>;
  }, [playbookResult]);

  return (
    <div className="stack section-space">
      <section className="panel stack">
        <div>
          <div className="kicker">{tr(locale, "Connect", "连接")}</div>
          <h2>{tr(locale, "Agent identity", "Agent 身份")}</h2>
        </div>
        <div className="form-row">
          <label>
            {tr(locale, "API base", "API 地址")}
            <input value={apiHint} readOnly />
          </label>
          <label>
            {tr(locale, "Agent API key", "Agent API key")}
            <input
              value={agentKey}
              onChange={(event) => setAgentKey(event.target.value)}
              placeholder={tr(locale, "paste bearer token", "粘贴 bearer token")}
              type={revealKey ? "text" : "password"}
              autoComplete="off"
            />
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" onClick={verifyAgent} disabled={!canAuth}>
            {tr(locale, "Verify", "验证")}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setRevealKey((value) => !value)}
            disabled={!canAuth}
          >
            {revealKey ? tr(locale, "Hide key", "隐藏 key") : tr(locale, "Reveal key", "显示 key")}
          </button>
          <button type="button" className="secondary" onClick={clearKey}>
            {tr(locale, "Clear key", "清除 key")}
          </button>
        </div>
        {agentError ? (
          <section className="notice error" role="alert">
            {agentError}
          </section>
        ) : null}
        {agentIdentity ? (
          <section className="notice success" role="status">
            {tr(locale, "Verified as", "已验证")} <strong>{agentIdentity.name}</strong>{" "}
            <span className="muted">({truncId(agentIdentity.id)})</span>{" "}
            {tr(locale, "in", "风险等级")} <strong>{agentIdentity.risk_tier}</strong>.
          </section>
        ) : null}
      </section>

      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="toolbar">
              <div className="stack" style={{ gap: 6 }}>
                <div className="kicker">{tr(locale, "Queue", "队列")}</div>
                <h2>{tr(locale, "Tasks", "任务")}</h2>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary" onClick={loadTasks}>
                  {tr(locale, "Refresh", "刷新")}
                </button>
              </div>
            </div>

            {tasksError ? (
              <section className="notice error" role="alert">
                {tasksError}
              </section>
            ) : null}

            <div className="form-row">
              <label>
                {tr(locale, "Show", "显示")}
                <select
                  value={taskStatusFilter}
                  onChange={(e) =>
                    setTaskStatusFilter(
                      (e.target.value as "pending" | "claimed" | "completed" | "all") ?? "pending",
                    )
                  }
                >
                  <option value="pending">{tr(locale, "Pending", "待认领")}</option>
                  <option value="claimed">{tr(locale, "Claimed", "已认领")}</option>
                  <option value="completed">{tr(locale, "Completed", "已完成")}</option>
                  <option value="all">{tr(locale, "All", "全部")}</option>
                </select>
              </label>
              <label>
                {tr(locale, "Eligible only", "仅显示可执行")}
                <select
                  value={onlyEligible ? "yes" : "no"}
                  onChange={(e) => setOnlyEligible(e.target.value === "yes")}
                  disabled={!agentIdentity}
                >
                  <option value="yes">{tr(locale, "Yes", "是")}</option>
                  <option value="no">{tr(locale, "No", "否")}</option>
                </select>
              </label>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="empty-state">
                {tasks.length === 0
                  ? tr(locale, "No tasks are visible. Ask an operator to publish one in the console.", "当前没有可见任务。请让运营者在控制台发布任务。")
                  : tr(locale, "No tasks match the current filters.", "没有任务符合当前筛选条件。")}
              </div>
            ) : (
              <div className="list" aria-label="Task queue">
                {visibleTasks.map((task) => {
                  const isActive = activeTask?.id === task.id;
                  const canClaim = task.status === "pending" && !task.claimed_by;
                  const eligible = eligibility ? eligibility.isEligible(task) : true;

                  return (
                    <article key={task.id} className="list-item task-card" data-testid="agent-task-card">
                      <div className="chip-row">
                        <span className="chip" data-tone={statusTone(task.status)}>
                          {task.status}
                        </span>
                        <span className="chip">{task.task_type}</span>
                        {task.lease_allowed ? <span className="chip">{tr(locale, "lease", "租约")}</span> : null}
                        {task.approval_mode === "manual" ? <span className="chip">{tr(locale, "manual", "人工")}</span> : null}
                        {task.claimed_by ? <span className="chip">{tr(locale, "claimed", "已认领")}</span> : null}
                        {agentIdentity && !eligible ? (
                          <span className="chip" data-tone="error">{tr(locale, "ineligible", "不符合")}</span>
                        ) : null}
                      </div>
                      <div className="stack">
                        <strong>{task.title}</strong>
                        <span className="muted">{task.id}</span>
                      </div>
                      {task.playbook_ids.length ? (
                        <div className="chip-row">
                          {task.playbook_ids.map((id) => (
                            <a key={id} className="chip" href={`/playbooks/${id}`}>
                              {id}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">{tr(locale, "No playbooks attached.", "未关联手册。")}</span>
                      )}
                      <div className="inline-actions">
                        <button type="button" className="secondary" onClick={() => setActiveTask(task)}>
                          {isActive ? tr(locale, "Selected", "已选择") : tr(locale, "Select", "选择")}
                        </button>
                        <button type="button" onClick={() => claimTask(task.id)} disabled={!canAuth || !canClaim}>
                          {tr(locale, "Claim", "认领")}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="workspace-side">
          <section className="panel stack">
            <div className="toolbar">
              <div className="stack" style={{ gap: 6 }}>
                <div className="kicker">{tr(locale, "Knowledge", "知识")}</div>
                <h2>{tr(locale, "Playbooks", "手册")}</h2>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    if (!playbookResult) return;
                    const ok = await copyText(JSON.stringify(playbookResult, null, 2));
                    setPlaybookCopied(ok);
                    window.setTimeout(() => setPlaybookCopied(false), 1200);
                  }}
                  disabled={!playbookResult}
                >
                  {playbookCopied ? tr(locale, "Copied", "已复制") : tr(locale, "Copy JSON", "复制 JSON")}
                </button>
              </div>
            </div>

            <label>
              {tr(locale, "Query", "检索")}
              <input
                value={playbookQuery}
                onChange={(e) => setPlaybookQuery(e.target.value)}
                placeholder="prompt run"
              />
            </label>

            <details className="compact-details">
              <summary>{tr(locale, "Filters", "筛选")}</summary>
              <div className="form-row">
                <label>
                  {tr(locale, "Task type", "任务类型")}
                  <input
                    value={playbookTaskType}
                    onChange={(e) => setPlaybookTaskType(e.target.value)}
                    placeholder="prompt_run"
                  />
                </label>
                <label>
                  {tr(locale, "Tag", "标签")}
                  <input value={playbookTag} onChange={(e) => setPlaybookTag(e.target.value)} placeholder="openai" />
                </label>
              </div>
              <label>
                {tr(locale, "View", "视图")}
                <select value={showRaw ? "raw" : "summary"} onChange={(e) => setShowRaw(e.target.value === "raw")}>
                  <option value="summary">{tr(locale, "Summary", "摘要")}</option>
                  <option value="raw">{tr(locale, "Raw JSON", "原始 JSON")}</option>
                </select>
              </label>
            </details>

            <div className="inline-actions">
              <button type="button" onClick={searchPlaybooksViaMcp} disabled={!canAuth}>
                {tr(locale, "Search", "搜索")}
              </button>
            </div>

            {playbookError ? (
              <section className="notice error" role="alert">
                {playbookError}
              </section>
            ) : null}

            {playbookResult ? (
              showRaw ? (
                <pre className="code-block">
                  <code>{JSON.stringify(playbookResult, null, 2)}</code>
                </pre>
              ) : playbookItems.length === 0 ? (
                <div className="empty-state">{tr(locale, "No playbooks matched.", "没有匹配的手册。")}</div>
              ) : (
                <div className="list" aria-label="Playbook results">
                  {playbookItems.slice(0, 10).map((playbook) => {
                    const id = typeof playbook.id === "string" ? playbook.id : "";
                    const title = typeof playbook.title === "string" ? playbook.title : id || "Untitled";
                    const taskType = typeof playbook.task_type === "string" ? playbook.task_type : "";
                    const tags = Array.isArray(playbook.tags) ? (playbook.tags as unknown[]) : [];
                    const body = typeof playbook.body === "string" ? playbook.body : "";

                    return (
                      <article key={id || title} className="list-item">
                        <div className="chip-row">
                          {taskType ? <span className="chip">{taskType}</span> : null}
                          {tags.slice(0, 3).map((tag) =>
                            typeof tag === "string" ? <span key={tag} className="chip">{tag}</span> : null,
                          )}
                        </div>
                        <div className="stack">
                          {id ? (
                            <a href={`/playbooks/${id}`}>
                              <strong>{title}</strong>
                            </a>
                          ) : (
                            <strong>{title}</strong>
                          )}
                          {id ? <span className="muted">{id}</span> : null}
                        </div>
                        {body ? <span className="muted">{body.slice(0, 140)}{body.length > 140 ? "…" : ""}</span> : null}
                      </article>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="empty-state">
                {tr(locale, "Search via MCP to pull playbooks into the runtime context.", "通过 MCP 检索手册，把上下文拉入运行时。")}
              </div>
            )}
          </section>

          <section className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Execute", "执行")}</div>
              <h2>{tr(locale, "Invoke, lease, complete", "调用、租约、完成")}</h2>
            </div>

            {!activeTask ? (
              <div className="empty-state">
                {tr(locale, "Select or claim a task from the queue to unlock runtime actions.", "从队列中选择或认领任务后才能执行运行时动作。")}
              </div>
            ) : (
              <>
                <section className="notice" role="status">
                  {tr(locale, "Active:", "当前任务：")} <strong>{activeTask.title}</strong>{" "}
                  <span className="muted">({truncId(activeTask.id)})</span>
                  {suggestedCapabilityId ? (
                    <>
                      {" "}
                      {tr(locale, "Default capability:", "默认 capability：")} <strong>{truncId(suggestedCapabilityId)}</strong>
                    </>
                  ) : null}
                </section>

                <div className="form-row">
                  <label>
                    {tr(locale, "Capability id (invoke)", "Capability id（调用）")}
                    <input
                      value={invokeCapabilityId}
                      onChange={(e) => setInvokeCapabilityId(e.target.value)}
                      placeholder={suggestedCapabilityId || "capability-1"}
                    />
                  </label>
                  <label>
                    {tr(locale, "Capability id (lease)", "Capability id（租约）")}
                    <input
                      value={leaseCapabilityId}
                      onChange={(e) => setLeaseCapabilityId(e.target.value)}
                      placeholder={suggestedCapabilityId || "capability-1"}
                    />
                  </label>
                </div>

                <details className="compact-details" open>
                  <summary>{tr(locale, "Invoke", "调用")}</summary>
                  <label>
                    {tr(locale, "Parameters (JSON)", "参数（JSON）")}
                    <textarea value={invokeParams} onChange={(e) => setInvokeParams(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={invokeCapability} disabled={!canAuth}>
                      {tr(locale, "Invoke", "调用")}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        const ok = await copyText(invokeParams);
                        if (!ok) setInvokeError(tr(locale, "Copy failed. Your browser may block clipboard access.", "复制失败，浏览器可能阻止剪贴板访问。"));
                      }}
                    >
                      {tr(locale, "Copy JSON", "复制 JSON")}
                    </button>
                  </div>
                  {invokeError ? (
                    <section className="notice error" role="alert">
                      {invokeError}
                    </section>
                  ) : null}
                  {invokeResult ? (
                    <details className="compact-details">
                      <summary>{tr(locale, "Response", "响应")}</summary>
                      <pre className="code-block">
                        <code>
                          {`status: ${invokeResult.status}\n` +
                            (invokeResult.json
                              ? JSON.stringify(invokeResult.json, null, 2)
                              : invokeResult.bodyText)}
                        </code>
                      </pre>
                    </details>
                  ) : null}
                </details>

                <details className="compact-details">
                  <summary>{tr(locale, "Lease", "租约")}</summary>
                  <label>
                    {tr(locale, "Purpose", "用途")}
                    <input value={leasePurpose} onChange={(e) => setLeasePurpose(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" className="secondary" onClick={requestLease} disabled={!canAuth}>
                      {tr(locale, "Request lease", "申请租约")}
                    </button>
                  </div>
                  {leaseError ? (
                    <section className="notice error" role="alert">
                      {leaseError}
                    </section>
                  ) : null}
                  {leaseResult ? (
                    <details className="compact-details">
                      <summary>{tr(locale, "Response", "响应")}</summary>
                      <pre className="code-block">
                        <code>
                          {`status: ${leaseResult.status}\n` +
                            (leaseResult.json ? JSON.stringify(leaseResult.json, null, 2) : leaseResult.bodyText)}
                        </code>
                      </pre>
                    </details>
                  ) : null}
                </details>

                <details className="compact-details">
                  <summary>{tr(locale, "Complete", "完成")}</summary>
                  <label>
                    {tr(locale, "Result summary", "结果摘要")}
                    <input value={completeResultSummary} onChange={(e) => setCompleteResultSummary(e.target.value)} />
                  </label>
                  <label>
                    {tr(locale, "Output payload (JSON)", "输出载荷（JSON）")}
                    <textarea value={completeOutput} onChange={(e) => setCompleteOutput(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={completeTask} disabled={!canAuth}>
                      {tr(locale, "Complete task", "完成任务")}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        const ok = await copyText(completeOutput);
                        if (!ok) setCompleteError(tr(locale, "Copy failed. Your browser may block clipboard access.", "复制失败，浏览器可能阻止剪贴板访问。"));
                      }}
                    >
                      {tr(locale, "Copy JSON", "复制 JSON")}
                    </button>
                  </div>
                  {completeError ? (
                    <section className="notice error" role="alert">
                      {completeError}
                    </section>
                  ) : null}
                  {completeResult ? (
                    <details className="compact-details">
                      <summary>{tr(locale, "Response", "响应")}</summary>
                      <pre className="code-block">
                        <code>
                          {`status: ${completeResult.status}\n` +
                            (completeResult.json
                              ? JSON.stringify(completeResult.json, null, 2)
                              : completeResult.bodyText)}
                        </code>
                      </pre>
                    </details>
                  ) : null}
                </details>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
