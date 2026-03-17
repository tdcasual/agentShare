import { NavShell } from "../../components/nav-shell";
import { AgentKeyDisplay } from "../../components/agent-key-display";
import { getAgents } from "../../lib/api";
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
  const params = (await searchParams) ?? {};
  const agents = await getAgents();
  const apiKey = readSingleParam(params, "api_key");
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Agents"
      title="Track each agent as its own identity with its own trust boundary."
      subtitle="Each agent authenticates independently and carries a bounded risk tier."
    >
      {apiKey && <AgentKeyDisplay apiKey={apiKey} />}

      {created && !apiKey && (
        <p role="status">Agent created: <strong>{created}</strong></p>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--color-error, #ef4444)" }}>
          Error: {error}
        </p>
      )}

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
