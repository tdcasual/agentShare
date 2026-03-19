import { NavShell } from "../../components/nav-shell";
import { getCollectionNotice, getPlaybooks } from "../../lib/api";

export default async function PlaybooksPage() {
  const playbooksResult = await getPlaybooks();
  const playbooks = playbooksResult.items;
  const playbooksNotice = getCollectionNotice(playbooksResult, "playbooks");

  return (
    <NavShell
      eyebrow="Playbooks"
      title="Share the small but valuable process knowledge that sits below a full skill."
      subtitle="Playbooks capture lightweight instructions, expected inputs, and common pitfalls so one agent’s success becomes reusable for the next one."
    >
      <section
        className={
          playbooksNotice.tone === "success"
            ? "notice success"
            : playbooksNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={playbooksNotice.tone === "error" ? "alert" : "status"}
      >
        {playbooksNotice.message}
      </section>
      <section className="panel stack">
        <div>
          <div className="kicker">Shared know-how</div>
          <h2>Lightweight execution recipes</h2>
        </div>
        {playbooks.length > 0 ? (
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
        ) : (
          <div className="empty-state">
            No playbooks are available yet. Publish one through the API to make execution knowledge reusable.
          </div>
        )}
      </section>
    </NavShell>
  );
}
