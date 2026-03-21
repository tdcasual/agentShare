import Link from "next/link";

import { NavShell } from "../components/nav-shell";
import { getApiBaseUrl } from "../lib/api";

const highlights = [
  { label: "Playbook search", value: "Ready", note: "Find reusable guidance by task type, text, and tag." },
  { label: "Policy-backed approvals", value: "Live", note: "Runtime actions can allow, require review, or deny." },
  { label: "MCP tools", value: "6", note: "Expose task, playbook, invoke, and lease operations to agents." },
];

export default function HomePage() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <NavShell
      eyebrow="Control plane"
      title="Coordinate humans, agents, secrets, and lightweight work in one place."
      subtitle="This dashboard is built for the model you chose: proxy-by-default capability execution, short-lived secret leases only when needed, and task-first collaboration for agents."
      activeHref="/"
    >
      <section className="hero-grid">
        <article className="panel feature-panel stack">
          <div className="section-intro-grid">
            <div className="stack">
              <div className="kicker">Operational overview</div>
              <h2>Run sensitive agent work through one deliberate, policy-shaped surface.</h2>
              <p className="muted section-intro">
                The control plane is at its best when humans set trust boundaries once and agents
                execute cleanly inside them. Secrets stay abstracted, approvals stay explainable,
                and reusable context stays close to the task.
              </p>
              <div className="subtle-actions">
                <Link className="button-link" href="/tasks">
                  Open task queue
                </Link>
                <Link className="button-link secondary" href="/approvals">
                  Open review queue
                </Link>
              </div>
            </div>
            <div className="aside-note">
              <strong>Phase 2 is now coherent</strong>
              <span className="muted">
                Knowledge, policy, adapters, and MCP are all visible in one console instead of
                hiding behind docs and API routes.
              </span>
            </div>
          </div>
        </article>
        {highlights.map((item) => (
          <article key={item.label} className="card">
            <div className="kicker">{item.label}</div>
            <div className="metric">{item.value}</div>
            <p className="muted">{item.note}</p>
          </article>
        ))}
      </section>
      <section className="grid section-space">
        <article className="panel stack">
          <div>
            <div className="kicker">Start with trust</div>
            <h2>Capture secrets in the console, not in chat threads</h2>
            <p className="muted">
              Keep sensitive credentials in the backend vault and expose them through named
              capabilities that agents can safely invoke.
            </p>
          </div>
          <Link className="button-link" href="/secrets">
            Manage secrets
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">Queue work</div>
            <h2>Publish lightweight tasks that agents can claim and complete</h2>
            <p className="muted">
              Tasks reference capabilities instead of raw tokens, so the control plane stays in the
              middle of every sensitive action. Attach playbooks when a task needs reusable operator
              guidance instead of one-off instructions.
            </p>
          </div>
          <Link className="button-link secondary" href="/tasks">
            Open tasks
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">Keep context reusable</div>
            <h2>Turn good runs into playbooks and keep approvals close by</h2>
            <p className="muted">
              Operators should be able to find reusable execution guidance and review higher-risk
              actions without digging through source or logs.
            </p>
          </div>
          <div className="chip-row">
            <Link className="button-link" href="/playbooks">
              Browse playbooks
            </Link>
            <Link className="button-link secondary" href="/approvals">
              Review approvals
            </Link>
          </div>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">Choose the right adapter</div>
            <h2>Use the narrowest capability contract that matches the upstream system</h2>
            <p className="muted">
              Pick <strong>openai</strong> for chat completions, <strong>github</strong> for
              repository-scoped REST calls, and <strong>generic_http</strong> only when no first-class
              adapter exists yet.
            </p>
          </div>
          <Link className="button-link secondary" href="/capabilities">
            Compare adapters
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">Self-serve onboarding</div>
            <h2>Start from HTTP or MCP, then confirm details in machine-readable contracts</h2>
            <p className="muted">
              New integrators should follow the quickstart first, choose the transport they need,
              then treat Swagger and OpenAPI as the source of truth for request and response
              contracts.
            </p>
          </div>
          <div className="chip-row">
            <Link className="button-link" href="/quickstart">
              HTTP quickstart
            </Link>
            <Link className="button-link secondary" href="/quickstart#mcp-quickstart">
              MCP quickstart
            </Link>
            {apiBaseUrl ? (
              <>
                <a className="button-link secondary" href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
                  Swagger UI
                </a>
                <a className="button-link secondary" href={`${apiBaseUrl}/openapi.json`} target="_blank" rel="noreferrer">
                  OpenAPI JSON
                </a>
              </>
            ) : null}
          </div>
        </article>
      </section>
    </NavShell>
  );
}
