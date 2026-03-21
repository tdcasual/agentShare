import { NavShell } from "../../components/nav-shell";
import { getCollectionNotice, getPlaybookSearch } from "../../lib/api";
import { requireManagementSession } from "../../lib/management-session";

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

function trimParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function excerpt(value: string, max = 140): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}...`;
}

export default async function PlaybooksPage({ searchParams }: PageProps) {
  await requireManagementSession("/playbooks");
  const params = (await searchParams) ?? {};
  const q = trimParam(readSingleParam(params, "q"));
  const taskType = trimParam(readSingleParam(params, "task_type"));
  const tag = trimParam(readSingleParam(params, "tag"));

  const playbooksResult = await getPlaybookSearch({
    q,
    taskType,
    tag,
  });
  const playbooks = playbooksResult.items;
  const playbooksNotice = getCollectionNotice(playbooksResult, "playbooks");
  const hasFilters = Boolean(q || taskType || tag);

  return (
    <NavShell
      eyebrow="Playbooks"
      title="Share the small but valuable process knowledge that sits below a full skill."
      subtitle="Playbooks capture lightweight instructions, expected inputs, and common pitfalls so one agent’s success becomes reusable for the next one. Operators can review them here, and agents can search the same knowledge through MCP."
      activeHref="/playbooks"
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
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel feature-panel stack">
            <div className="section-intro-grid">
              <div>
                <div className="kicker">Search</div>
                <h2>Find reusable execution knowledge quickly</h2>
                <p className="muted section-intro">
                  Use task type for queue-aligned filtering, text search for instructions, and tags
                  for provider or workflow hints. This should feel more like searching an internal
                  field guide than browsing CMS entries.
                </p>
              </div>
              <div className="aside-note">
                <strong>{playbooksResult.meta.total} matching playbooks</strong>
                <span className="muted">
                  Operators read them here; agents can search the same surface through MCP.
                </span>
              </div>
            </div>
            <form method="get" action="/playbooks" className="form dense-form">
              <div className="form-row">
                <label>
                  Query
                  <input
                    type="text"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search title and body"
                  />
                </label>
                <label>
                  Task type
                  <input
                    type="text"
                    name="task_type"
                    defaultValue={taskType ?? ""}
                    placeholder="prompt_run"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Tag
                  <input
                    type="text"
                    name="tag"
                    defaultValue={tag ?? ""}
                    placeholder="openai"
                  />
                </label>
                <div className="stack">
                  <span className="muted form-footnote">
                    Filter by one provider, one task family, or one recurring operation pattern at
                    a time.
                  </span>
                  <div className="subtle-actions">
                    <button type="submit">Apply filters</button>
                    <a className="button-link secondary" href="/playbooks">
                      Clear
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
        <div className="workspace-side">
          <section className="panel stack">
            <div>
              <div className="kicker">Shared know-how</div>
              <h2>Lightweight execution recipes</h2>
            </div>
            <div className="toolbar">
              <p className="muted">
                Showing {playbooksResult.meta.items_count} of {playbooksResult.meta.total} playbooks.
              </p>
              {hasFilters ? (
                <div className="chip-row">
                  {q ? <span className="chip">q:{q}</span> : null}
                  {taskType ? <span className="chip">task_type:{taskType}</span> : null}
                  {tag ? <span className="chip">tag:{tag}</span> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
      <section className="panel stack section-space">
        <div>
          <div className="kicker">Library</div>
          <h2>Browse the matching playbooks</h2>
        </div>
        {playbooks.length > 0 ? (
          <ul className="list editorial-list">
            {playbooks.map((playbook) => (
              <li key={playbook.id} className="list-item">
                <a className="list-link" href={`/playbooks/${playbook.id}`}>
                  <strong>{playbook.title}</strong>
                </a>
                <span className="muted">{playbook.task_type}</span>
                <p className="muted">{excerpt(playbook.body)}</p>
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
            No playbooks are available yet. Publish one through the API, then attach it to a task so
            future agents can reuse the same instructions.
          </div>
        )}
      </section>
    </NavShell>
  );
}
