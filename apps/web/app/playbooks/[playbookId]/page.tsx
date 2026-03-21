import { NavShell } from "../../../components/nav-shell";
import { getPlaybookById } from "../../../lib/api";
import { requireManagementSession } from "../../../lib/management-session";

type PageProps = {
  params: Promise<{ playbookId: string }>;
};

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { playbookId } = await params;
  await requireManagementSession(`/playbooks/${encodeURIComponent(playbookId)}`);

  const result = await getPlaybookById(playbookId);
  const playbook = result.item;

  return (
    <NavShell
      eyebrow="Playbook detail"
      title={playbook ? playbook.title : "Playbook not found"}
      subtitle="Review the complete instructions before running higher-risk or repetitive workflows."
      activeHref="/playbooks"
    >
      {playbook ? (
        <section className="panel stack">
          <div className="chip-row">
            <span className="chip">{playbook.task_type}</span>
            {playbook.tags.map((tag) => (
              <span key={tag} className="chip">{tag}</span>
            ))}
          </div>
          <article className="stack">
            <h2>Instructions</h2>
            <p>{playbook.body}</p>
          </article>
          <a className="button-link" href="/playbooks">
            Back to playbooks
          </a>
        </section>
      ) : (
        <section className="panel stack">
          <div className="kicker">Missing record</div>
          <h2>That playbook is unavailable.</h2>
          <p className="muted">
            {result.error ?? "The requested playbook could not be loaded."}
          </p>
          <a className="button-link" href="/playbooks">
            Back to playbooks
          </a>
        </section>
      )}
    </NavShell>
  );
}
