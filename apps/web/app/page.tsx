import Link from "next/link";

import { NavShell } from "../components/nav-shell";
import { getApiBaseUrl } from "../lib/api";

const highlights = [
  { label: "Proxy-first capabilities", value: "Default", note: "Keep secrets behind the gateway." },
  { label: "Short-lived leases", value: "Optional", note: "Allow them only when proxy mode cannot work." },
  { label: "Reusable traces", value: "Built-in", note: "Every task leaves behind a playbook-friendly trail." },
];

export default function HomePage() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <NavShell
      eyebrow="Control plane"
      title="Coordinate humans, agents, secrets, and lightweight work in one place."
      subtitle="This dashboard is built for the model you chose: proxy-by-default capability execution, short-lived secret leases only when needed, and task-first collaboration for agents."
    >
      <section className="hero-grid">
        {highlights.map((item) => (
          <article key={item.label} className="card">
            <div className="kicker">{item.label}</div>
            <div className="metric">{item.value}</div>
            <p className="muted">{item.note}</p>
          </article>
        ))}
      </section>
      <section className="grid" style={{ marginTop: 18 }}>
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
              middle of every sensitive action.
            </p>
          </div>
          <Link className="button-link secondary" href="/tasks">
            Open tasks
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">Self-serve onboarding</div>
            <h2>Start from an operational guide and machine-readable API contracts</h2>
            <p className="muted">
              New integrators should follow the quickstart first, then treat Swagger and OpenAPI
              as the source of truth for request and response contracts.
            </p>
          </div>
          <div className="chip-row">
            <Link className="button-link" href="/quickstart">
              Agent quickstart
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
