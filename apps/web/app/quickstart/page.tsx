import Link from "next/link";

import { NavShell } from "../../components/nav-shell";
import { getApiDocsLinks } from "../../lib/api";

const apiBase = "http://127.0.0.1:8000";

const steps = [
  {
    title: "1. Verify agent identity",
    code: `export ACP_BASE_URL=${apiBase}
export ACP_AGENT_KEY=replace-me

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  "$ACP_BASE_URL/api/agents/me"`,
  },
  {
    title: "2. List tasks",
    code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  "$ACP_BASE_URL/api/tasks"`,
  },
  {
    title: "3. Claim a task",
    code: `export TASK_ID=task-1

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -X POST \\
  "$ACP_BASE_URL/api/tasks/$TASK_ID/claim"`,
  },
  {
    title: "4. Invoke a capability through proxy mode",
    code: `export CAPABILITY_ID=capability-1

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_id":"task-1","parameters":{"prompt":"hello"}}' \\
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/invoke"`,
  },
  {
    title: "5. Request a lease only when proxy mode is not enough",
    code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_id":"task-1","purpose":"git cli access"}' \\
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"`,
  },
  {
    title: "6. Complete the task",
    code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"result_summary":"Configuration synced","output_payload":{"ok":true}}' \\
  -X POST \\
  "$ACP_BASE_URL/api/tasks/$TASK_ID/complete"`,
  },
];

export default function QuickstartPage() {
  const apiDocsLinks = getApiDocsLinks();

  return (
    <NavShell
      eyebrow="Quickstart"
      title="Teach a new agent the exact control-plane happy path."
      subtitle="Use this page for the call order. Use Swagger UI and raw OpenAPI for machine-readable request and response details."
    >
      <section className="panel stack">
        <div>
          <div className="kicker">Self-serve route</div>
          <h2>One guide for humans, two machine-readable links for agents</h2>
          <p className="muted">
            Runtime routes use per-agent bearer API keys. Human management routes are temporarily
            bootstrap-key protected until session auth exists.
          </p>
        </div>
        <div className="chip-row">
          <Link className="button-link secondary" href="/agents">
            Create or inspect agents
          </Link>
          {apiDocsLinks ? (
            <>
              <a className="button-link" href={apiDocsLinks.swaggerUrl} target="_blank" rel="noreferrer">
                Swagger UI
              </a>
              <a className="button-link secondary" href={apiDocsLinks.openapiUrl} target="_blank" rel="noreferrer">
                OpenAPI JSON
              </a>
            </>
          ) : (
            <span className="muted">Configure `AGENT_CONTROL_PLANE_API_URL` to show live API docs links.</span>
          )}
        </div>
      </section>
      <section className="grid" style={{ marginTop: 18 }}>
        {steps.map((step) => (
          <article key={step.title} className="panel stack">
            <div>
              <div className="kicker">Happy path</div>
              <h2>{step.title}</h2>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "1rem",
                borderRadius: 18,
                overflowX: "auto",
                background: "rgba(45, 32, 23, 0.08)",
              }}
            >
              <code>{step.code}</code>
            </pre>
          </article>
        ))}
      </section>
      <section className="panel stack" style={{ marginTop: 18 }}>
        <div>
          <div className="kicker">Failure codes</div>
          <h2>What agents should infer from common failures</h2>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>401</strong>
            <span className="muted">Missing, unknown, or revoked bearer token.</span>
          </div>
          <div className="list-item">
            <strong>403</strong>
            <span className="muted">Outside the allowlist, task contract, or lease policy boundary.</span>
          </div>
          <div className="list-item">
            <strong>409</strong>
            <span className="muted">The task is already claimed or no longer claimable.</span>
          </div>
        </div>
      </section>
    </NavShell>
  );
}
