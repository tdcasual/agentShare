import Link from "next/link";

import { NavShell } from "../../components/nav-shell";
import { AgentKeyDisplay } from "../../components/agent-key-display";
import { getAgents, getApiDocsLinks, getApiBaseUrl, getCollectionNotice } from "../../lib/api";
import { requireManagementSession } from "../../lib/management-session";
import { createAgentAction } from "../actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AgentsPage({ searchParams }: PageProps) {
  await requireManagementSession("/agents");
  const params = (await searchParams) ?? {};
  const agentsResult = await getAgents();
  const agents = agentsResult.items;
  const agentsNotice = getCollectionNotice(agentsResult, "agents");
  const apiBaseUrl = getApiBaseUrl();
  const apiDocsLinks = getApiDocsLinks();
  const apiKey = readSingleParam(params, "api_key");
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Agents"
      title="Track each agent as its own identity with its own trust boundary."
      subtitle="Each agent authenticates independently and carries a bounded risk tier."
    >
      {apiKey && <AgentKeyDisplay apiKey={apiKey} apiBaseUrl={apiBaseUrl} />}

      {created && !apiKey && (
        <p role="status">Agent created: <strong>{created}</strong></p>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--color-error, #ef4444)" }}>
          Error: {
            error === "management-auth"
              ? "The management session is missing or expired."
              : error === "api-disconnected"
                ? "The API base URL is not configured for management calls."
                : "The agent could not be created."
          }
        </p>
      )}
      <section
        className={
          agentsNotice.tone === "success"
            ? "notice success"
            : agentsNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={agentsNotice.tone === "error" ? "alert" : "status"}
      >
        {agentsNotice.message}
      </section>

      <section className="panel stack" style={{ marginBottom: "1.5rem" }}>
        <div>
          <div className="kicker">Onboarding links</div>
          <h2>Teach new agents with the quickstart and API schema</h2>
        </div>
        <div className="chip-row">
          <Link className="button-link" href="/quickstart">
            Agent quickstart
          </Link>
          {apiDocsLinks ? (
            <>
              <a className="button-link secondary" href={apiDocsLinks.swaggerUrl} target="_blank" rel="noreferrer">
                Swagger UI
              </a>
              <a className="button-link secondary" href={apiDocsLinks.openapiUrl} target="_blank" rel="noreferrer">
                OpenAPI JSON
              </a>
            </>
          ) : (
            <span className="muted">Set `AGENT_CONTROL_PLANE_API_URL` to show live API docs links.</span>
          )}
        </div>
      </section>

      <details style={{ marginBottom: "1.5rem" }}>
        <summary>Register new agent</summary>
        <form action={createAgentAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "24rem" }}>
          <label htmlFor="agent-name">
            Name
            <input id="agent-name" name="name" type="text" required placeholder="e.g. deploy-bot" />
          </label>
          <label htmlFor="agent-risk-tier">
            Risk tier
            <select id="agent-risk-tier" name="risk_tier" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <button type="submit">Create agent</button>
        </form>
      </details>

      <section className="grid">
        {agents.map((agent) => (
          <article key={agent.id} className="card">
            <div className="kicker">{agent.id}</div>
            <h2>{agent.name}</h2>
            <p className="muted">
              Auth via {agent.auth_method}, operating in the {agent.risk_tier} risk tier.
            </p>
          </article>
        ))}
      </section>
    </NavShell>
  );
}
