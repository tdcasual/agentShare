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
): Promise<{ status: number; bodyText: string; json: unknown | null }> {
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

export function AgentSelfServe({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [agentKey, setAgentKey] = useState("");
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);

  const [playbookQuery, setPlaybookQuery] = useState("");
  const [playbookTaskType, setPlaybookTaskType] = useState("");
  const [playbookTag, setPlaybookTag] = useState("");
  const [playbookResult, setPlaybookResult] = useState<unknown | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

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

  const suggestedCapabilityId = useMemo(() => {
    if (!activeTask) return "";
    return activeTask.required_capability_ids[0] ?? "";
  }, [activeTask]);

  async function verifyAgent() {
    setAgentError(null);
    setAgentIdentity(null);
    if (!canAuth) {
      setAgentError("Paste an agent API key first.");
      return;
    }

    const response = await agentFetchJson("/api/agent/agents/me", { agentKey });
    if (response.status !== 200) {
      setAgentError(`Verify failed: ${response.status} ${response.bodyText}`.trim());
      return;
    }
    setAgentIdentity(response.json as AgentIdentity);
  }

  async function loadTasks() {
    setTasksError(null);
    const response = await agentFetchJson("/api/agent/tasks");
    if (response.status !== 200) {
      setTasksError(`Failed to load tasks: ${response.status} ${response.bodyText}`.trim());
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
      setTasksError(`Claim failed: ${response.status} ${response.bodyText}`.trim());
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
      setPlaybookError(`MCP call failed: ${response.status} ${response.bodyText}`.trim());
      return;
    }

    const payload = response.json as McpToolCallResult;
    if ((payload as any)?.result?.isError) {
      setPlaybookError(`MCP tool returned an error: ${JSON.stringify((payload as any).result)}`);
      return;
    }
    setPlaybookResult(payload);
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

  return (
    <div className="stack section-space">
      <section className="panel stack">
        <div>
          <div className="kicker">Self-serve</div>
          <h2>Agent runtime console</h2>
          <p className="muted">
            Use this page to verify an agent key, claim work, search playbooks through MCP, then
            invoke capabilities and complete the task.
          </p>
        </div>
        <div className="form-row">
          <label>
            API base (server configured)
            <input value={apiHint} readOnly />
          </label>
          <label>
            Agent API key
            <input
              value={agentKey}
              onChange={(event) => setAgentKey(event.target.value)}
              placeholder="paste bearer token"
              type="password"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" onClick={verifyAgent} disabled={!canAuth}>
            Verify
          </button>
          <button type="button" className="secondary" onClick={clearKey}>
            Clear key
          </button>
          <button type="button" className="secondary" onClick={loadTasks}>
            Refresh tasks
          </button>
        </div>
        {agentError ? (
          <section className="notice error" role="alert">
            {agentError}
          </section>
        ) : null}
        {agentIdentity ? (
          <section className="notice success" role="status">
            Verified as <strong>{agentIdentity.name}</strong> ({agentIdentity.id}) in{" "}
            <strong>{agentIdentity.risk_tier}</strong> tier.
          </section>
        ) : null}
      </section>

      <section className="panel stack">
        <div>
          <div className="kicker">Work queue</div>
          <h2>Tasks</h2>
        </div>
        {tasksError ? (
          <section className="notice error" role="alert">
            {tasksError}
          </section>
        ) : null}
        {tasks.length === 0 ? (
          <div className="empty-state">
            No tasks are visible right now. If you expected tasks, ask an operator to publish one
            in the console.
          </div>
        ) : (
          <div className="list">
            {tasks.map((task) => {
              const isActive = activeTask?.id === task.id;
              return (
                <article key={task.id} className="list-item">
                  <div className="chip-row">
                    <span className="chip">{task.status}</span>
                    <span className="chip">{task.task_type}</span>
                    {task.lease_allowed ? <span className="chip">lease</span> : null}
                    {task.approval_mode === "manual" ? <span className="chip">manual</span> : null}
                  </div>
                  <div className="stack">
                    <strong>{task.title}</strong>
                    <span className="muted">{task.id}</span>
                  </div>
                  {task.playbook_ids.length ? (
                    <div className="chip-row">
                      {task.playbook_ids.map((id) => (
                        <span key={id} className="chip">
                          {id}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="inline-actions">
                    <button type="button" className="secondary" onClick={() => setActiveTask(task)}>
                      {isActive ? "Selected" : "Select"}
                    </button>
                    <button type="button" onClick={() => claimTask(task.id)} disabled={!canAuth}>
                      Claim
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel stack">
        <div>
          <div className="kicker">Knowledge</div>
          <h2>Search playbooks through MCP</h2>
        </div>
        <div className="form-row">
          <label>
            Query
            <input value={playbookQuery} onChange={(e) => setPlaybookQuery(e.target.value)} placeholder="prompt run" />
          </label>
          <label>
            Task type
            <input value={playbookTaskType} onChange={(e) => setPlaybookTaskType(e.target.value)} placeholder="prompt_run" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Tag
            <input value={playbookTag} onChange={(e) => setPlaybookTag(e.target.value)} placeholder="openai" />
          </label>
          <label>
            View
            <select value={showRaw ? "raw" : "summary"} onChange={(e) => setShowRaw(e.target.value === "raw")}>
              <option value="summary">Summary</option>
              <option value="raw">Raw JSON</option>
            </select>
          </label>
        </div>
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
          <pre className="code-block">
            <code>{showRaw ? JSON.stringify(playbookResult, null, 2) : JSON.stringify((playbookResult as any)?.result?.content ?? playbookResult, null, 2)}</code>
          </pre>
        ) : null}
      </section>

      <section className="panel stack">
        <div>
          <div className="kicker">Execution</div>
          <h2>Invoke and complete</h2>
          <p className="muted">
            Select a task to prefill the task id. Use the first required capability as the default
            capability id.
          </p>
        </div>
        {!activeTask ? (
          <div className="empty-state">Select or claim a task above to unlock runtime actions.</div>
        ) : (
          <>
            <section className="notice" role="status">
              Active task: <strong>{activeTask.title}</strong> ({activeTask.id})
              {activeTask.required_capability_ids.length ? (
                <>
                  {" "}
                  Default capability: <strong>{suggestedCapabilityId}</strong>
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

            <label>
              Invoke parameters (JSON)
              <textarea value={invokeParams} onChange={(e) => setInvokeParams(e.target.value)} />
            </label>
            <div className="inline-actions">
              <button type="button" onClick={invokeCapability} disabled={!canAuth}>
                Invoke
              </button>
            </div>
            {invokeError ? (
              <section className="notice error" role="alert">
                {invokeError}
              </section>
            ) : null}
            {invokeResult ? (
              <pre className="code-block">
                <code>
                  {`status: ${invokeResult.status}\n` + (invokeResult.json ? JSON.stringify(invokeResult.json, null, 2) : invokeResult.bodyText)}
                </code>
              </pre>
            ) : null}

            <div className="form-row">
              <label>
                Lease purpose
                <input value={leasePurpose} onChange={(e) => setLeasePurpose(e.target.value)} />
              </label>
              <div className="stack">
                <span className="muted form-footnote">
                  Request a lease only if proxy mode is not enough (for example: CLI tooling).
                </span>
                <div className="inline-actions">
                  <button type="button" className="secondary" onClick={requestLease} disabled={!canAuth}>
                    Request lease
                  </button>
                </div>
              </div>
            </div>

            {leaseError ? (
              <section className="notice error" role="alert">
                {leaseError}
              </section>
            ) : null}
            {leaseResult ? (
              <pre className="code-block">
                <code>
                  {`status: ${leaseResult.status}\n` + (leaseResult.json ? JSON.stringify(leaseResult.json, null, 2) : leaseResult.bodyText)}
                </code>
              </pre>
            ) : null}

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
            </div>
            {completeError ? (
              <section className="notice error" role="alert">
                {completeError}
              </section>
            ) : null}
            {completeResult ? (
              <pre className="code-block">
                <code>
                  {`status: ${completeResult.status}\n` + (completeResult.json ? JSON.stringify(completeResult.json, null, 2) : completeResult.bodyText)}
                </code>
              </pre>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

