import { NavShell } from "../../components/nav-shell";
import { getAgents } from "../../lib/api";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <NavShell
      eyebrow="Agents"
      title="Track each agent as its own identity with its own trust boundary."
      subtitle="Shared global tokens are exactly what this platform is trying to avoid. Each agent should authenticate independently and carry a bounded risk tier."
    >
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
