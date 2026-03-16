import { NavShell } from "../../components/nav-shell";
import { getPlaybooks } from "../../lib/api";

export default async function PlaybooksPage() {
  const playbooks = await getPlaybooks();

  return (
    <NavShell
      eyebrow="Playbooks"
      title="Share the small but valuable process knowledge that sits below a full skill."
      subtitle="Playbooks capture lightweight instructions, expected inputs, and common pitfalls so one agent’s success becomes reusable for the next one."
    >
      <section className="panel stack">
        <div>
          <div className="kicker">Shared know-how</div>
          <h2>Lightweight execution recipes</h2>
        </div>
        <ul className="list">
          {playbooks.map((playbook) => (
            <li key={playbook.id} className="list-item">
              <strong>{playbook.title}</strong>
              <span className="muted">{playbook.task_type}</span>
              <div className="chip-row">
                {playbook.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </NavShell>
  );
}
