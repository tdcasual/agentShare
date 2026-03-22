"use client";

import { useEffect, useMemo, useState } from "react";

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

function formatApiError(action: string, response: AgentHttpResult): string {
  const payload = asRecord(response.json);
  const detail = payload?.detail;
  if (typeof detail === "string") {
    return `${action} failed (${response.status}): ${detail}`;
  }
  const detailObj = asRecord(detail);
  const code = typeof detailObj?.code === "string" ? detailObj.code : null;

  if (code === "approval_required") {
    const approvalId =
      typeof detailObj?.approval_request_id === "string" ? detailObj.approval_request_id : "";
    const policyReason =
      typeof detailObj?.policy_reason === "string" ? detailObj.policy_reason : "";
    return [
      `${action} blocked: approval required.`,
      approvalId ? `Request: ${approvalId}.` : null,
      policyReason ? `Policy: ${policyReason}.` : null,
      "Ask an operator to approve it in /approvals, then retry.",
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
    return `${action} denied by policy: ${policyLine}${policySource ? ` (${policySource})` : ""}`;
  }

  if (response.status === 401) {
    return `${action} failed: missing, unknown, or revoked agent key.`;
  }

  if (typeof response.bodyText === "string" && response.bodyText.trim()) {
    return `${action} failed (${response.status}): ${response.bodyText}`;
  }
  return `${action} failed (${response.status}).`;
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

export function AgentSelfServe({ apiBaseUrl }: { apiBaseUrl: string }) {
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
  const apiHint = apiBaseUrl || "Set AGENT_CONTROL_PLANE_API_URL on the web server.";

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
      setAgentError("Paste an agent API key first.");
      return;
    }

    const response = await agentFetchJson("/api/agent/agents/me", { agentKey });
    if (response.status !== 200) {
      setAgentError(formatApiError("Verify", response));
      return;
    }
    setAgentIdentity(response.json as AgentIdentity);
  }

  async function loadTasks() {
    setTasksError(null);
    const response = await agentFetchJson("/api/agent/tasks");
    if (response.status !== 200) {
      setTasksError(formatApiError("Load tasks", response));
      setTasks([]);
      return;
    }
    const payload = response.json as { items?: TaskRecord[] };
    setTasks(Array.isArray(payload?.items) ? payload.items : []);
  }

  async function claimTask(taskId: string) {
    setTasksError(null);
    if (!canAuth) {
      setTasksError("Paste an agent API key to claim tasks.");
      return;
    }
    const response = await agentFetchJson(`/api/agent/tasks/${taskId}/claim`, { method: "POST", agentKey });
    if (response.status !== 200) {
      setTasksError(formatApiError("Claim", response));
      return;
    }
    setActiveTask(response.json as TaskRecord);
    await loadTasks();
  }

  async function searchPlaybooksViaMcp() {
    setPlaybookError(null);
    setPlaybookResult(null);
    if (!canAuth) {
      setPlaybookError("Paste an agent API key to call MCP tools.");
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
      setPlaybookError(formatApiError("MCP call", response));
      return;
    }

    const payload = response.json as McpToolEnvelope;
    const toolResult = payload?.result;
    if (toolResult?.isError) {
      setPlaybookError(`MCP tool returned an error: ${JSON.stringify(toolResult.structuredContent ?? toolResult)}`);
      return;
    }
    setPlaybookResult(toolResult?.structuredContent ?? payload);
  }

  async function invokeCapability() {
    setInvokeError(null);
    setInvokeResult(null);
    if (!activeTask) {
      setInvokeError("Claim or select a task first.");
      return;
    }
    if (!canAuth) {
      setInvokeError("Paste an agent API key first.");
      return;
    }
    const capabilityId = (invokeCapabilityId || suggestedCapabilityId).trim();
    if (!capabilityId) {
      setInvokeError("Enter a capability id.");
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
      setInvokeError(formatApiError("Invoke", response));
    }
  }

  async function requestLease() {
    setLeaseError(null);
    setLeaseResult(null);
    if (!activeTask) {
      setLeaseError("Claim or select a task first.");
      return;
    }
    if (!canAuth) {
      setLeaseError("Paste an agent API key first.");
      return;
    }
    const capabilityId = (leaseCapabilityId || suggestedCapabilityId).trim();
    if (!capabilityId) {
      setLeaseError("Enter a capability id.");
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
      setLeaseError(formatApiError("Lease", response));
    }
  }

  async function completeTask() {
    setCompleteError(null);
    setCompleteResult(null);
    if (!activeTask) {
      setCompleteError("Claim or select a task first.");
      return;
    }
    if (!canAuth) {
      setCompleteError("Paste an agent API key first.");
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
      setCompleteError(formatApiError("Complete", response));
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
          <div className="kicker">Connect</div>
          <h2>Agent identity</h2>
        </div>
        <div className="form-row">
          <label>
            API base
            <input value={apiHint} readOnly />
          </label>
          <label>
            Agent API key
            <input
              value={agentKey}
              onChange={(event) => setAgentKey(event.target.value)}
              placeholder="paste bearer token"
              type={revealKey ? "text" : "password"}
              autoComplete="off"
            />
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" onClick={verifyAgent} disabled={!canAuth}>
            Verify
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setRevealKey((value) => !value)}
            disabled={!canAuth}
          >
            {revealKey ? "Hide key" : "Reveal key"}
          </button>
          <button type="button" className="secondary" onClick={clearKey}>
            Clear key
          </button>
        </div>
        {agentError ? (
          <section className="notice error" role="alert">
            {agentError}
          </section>
        ) : null}
        {agentIdentity ? (
          <section className="notice success" role="status">
            Verified as <strong>{agentIdentity.name}</strong>{" "}
            <span className="muted">({truncId(agentIdentity.id)})</span> in{" "}
            <strong>{agentIdentity.risk_tier}</strong>.
          </section>
        ) : null}
      </section>

      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="toolbar">
              <div className="stack" style={{ gap: 6 }}>
                <div className="kicker">Queue</div>
                <h2>Tasks</h2>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary" onClick={loadTasks}>
                  Refresh
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
                Show
                <select
                  value={taskStatusFilter}
                  onChange={(e) =>
                    setTaskStatusFilter(
                      (e.target.value as "pending" | "claimed" | "completed" | "all") ?? "pending",
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="claimed">Claimed</option>
                  <option value="completed">Completed</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label>
                Eligible only
                <select
                  value={onlyEligible ? "yes" : "no"}
                  onChange={(e) => setOnlyEligible(e.target.value === "yes")}
                  disabled={!agentIdentity}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="empty-state">
                {tasks.length === 0
                  ? "No tasks are visible. Ask an operator to publish one in the console."
                  : "No tasks match the current filters."}
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
                        {task.lease_allowed ? <span className="chip">lease</span> : null}
                        {task.approval_mode === "manual" ? <span className="chip">manual</span> : null}
                        {task.claimed_by ? <span className="chip">claimed</span> : null}
                        {agentIdentity && !eligible ? <span className="chip" data-tone="error">ineligible</span> : null}
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
                        <span className="muted">No playbooks attached.</span>
                      )}
                      <div className="inline-actions">
                        <button type="button" className="secondary" onClick={() => setActiveTask(task)}>
                          {isActive ? "Selected" : "Select"}
                        </button>
                        <button type="button" onClick={() => claimTask(task.id)} disabled={!canAuth || !canClaim}>
                          Claim
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
                <div className="kicker">Knowledge</div>
                <h2>Playbooks</h2>
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
                  {playbookCopied ? "Copied" : "Copy JSON"}
                </button>
              </div>
            </div>

            <label>
              Query
              <input
                value={playbookQuery}
                onChange={(e) => setPlaybookQuery(e.target.value)}
                placeholder="prompt run"
              />
            </label>

            <details className="compact-details">
              <summary>Filters</summary>
              <div className="form-row">
                <label>
                  Task type
                  <input
                    value={playbookTaskType}
                    onChange={(e) => setPlaybookTaskType(e.target.value)}
                    placeholder="prompt_run"
                  />
                </label>
                <label>
                  Tag
                  <input value={playbookTag} onChange={(e) => setPlaybookTag(e.target.value)} placeholder="openai" />
                </label>
              </div>
              <label>
                View
                <select value={showRaw ? "raw" : "summary"} onChange={(e) => setShowRaw(e.target.value === "raw")}>
                  <option value="summary">Summary</option>
                  <option value="raw">Raw JSON</option>
                </select>
              </label>
            </details>

            <div className="inline-actions">
              <button type="button" onClick={searchPlaybooksViaMcp} disabled={!canAuth}>
                Search
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
                <div className="empty-state">No playbooks matched.</div>
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
              <div className="empty-state">Search via MCP to pull playbooks into the runtime context.</div>
            )}
          </section>

          <section className="panel stack">
            <div>
              <div className="kicker">Execute</div>
              <h2>Invoke, lease, complete</h2>
            </div>

            {!activeTask ? (
              <div className="empty-state">Select or claim a task from the queue to unlock runtime actions.</div>
            ) : (
              <>
                <section className="notice" role="status">
                  Active: <strong>{activeTask.title}</strong>{" "}
                  <span className="muted">({truncId(activeTask.id)})</span>
                  {suggestedCapabilityId ? (
                    <>
                      {" "}
                      Default capability: <strong>{truncId(suggestedCapabilityId)}</strong>
                    </>
                  ) : null}
                </section>

                <div className="form-row">
                  <label>
                    Capability id (invoke)
                    <input
                      value={invokeCapabilityId}
                      onChange={(e) => setInvokeCapabilityId(e.target.value)}
                      placeholder={suggestedCapabilityId || "capability-1"}
                    />
                  </label>
                  <label>
                    Capability id (lease)
                    <input
                      value={leaseCapabilityId}
                      onChange={(e) => setLeaseCapabilityId(e.target.value)}
                      placeholder={suggestedCapabilityId || "capability-1"}
                    />
                  </label>
                </div>

                <details className="compact-details" open>
                  <summary>Invoke</summary>
                  <label>
                    Parameters (JSON)
                    <textarea value={invokeParams} onChange={(e) => setInvokeParams(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={invokeCapability} disabled={!canAuth}>
                      Invoke
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        const ok = await copyText(invokeParams);
                        if (!ok) setInvokeError("Copy failed. Your browser may block clipboard access.");
                      }}
                    >
                      Copy JSON
                    </button>
                  </div>
                  {invokeError ? (
                    <section className="notice error" role="alert">
                      {invokeError}
                    </section>
                  ) : null}
                  {invokeResult ? (
                    <details className="compact-details">
                      <summary>Response</summary>
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
                  <summary>Lease</summary>
                  <label>
                    Purpose
                    <input value={leasePurpose} onChange={(e) => setLeasePurpose(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" className="secondary" onClick={requestLease} disabled={!canAuth}>
                      Request lease
                    </button>
                  </div>
                  {leaseError ? (
                    <section className="notice error" role="alert">
                      {leaseError}
                    </section>
                  ) : null}
                  {leaseResult ? (
                    <details className="compact-details">
                      <summary>Response</summary>
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
                  <summary>Complete</summary>
                  <label>
                    Result summary
                    <input value={completeResultSummary} onChange={(e) => setCompleteResultSummary(e.target.value)} />
                  </label>
                  <label>
                    Output payload (JSON)
                    <textarea value={completeOutput} onChange={(e) => setCompleteOutput(e.target.value)} />
                  </label>
                  <div className="inline-actions">
                    <button type="button" onClick={completeTask} disabled={!canAuth}>
                      Complete task
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        const ok = await copyText(completeOutput);
                        if (!ok) setCompleteError("Copy failed. Your browser may block clipboard access.");
                      }}
                    >
                      Copy JSON
                    </button>
                  </div>
                  {completeError ? (
                    <section className="notice error" role="alert">
                      {completeError}
                    </section>
                  ) : null}
                  {completeResult ? (
                    <details className="compact-details">
                      <summary>Response</summary>
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
