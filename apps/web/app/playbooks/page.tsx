import { NavShell } from "../../components/nav-shell";
import { getCollectionNotice, getPlaybookSearch } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
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
  const locale = await getLocale();
  const q = trimParam(readSingleParam(params, "q"));
  const taskType = trimParam(readSingleParam(params, "task_type"));
  const tag = trimParam(readSingleParam(params, "tag"));

  const playbooksResult = await getPlaybookSearch({
    q,
    taskType,
    tag,
  });
  const playbooks = playbooksResult.items;
  const playbooksNotice = getCollectionNotice(playbooksResult, tr(locale, "playbooks", "手册"), locale);
  const hasFilters = Boolean(q || taskType || tag);

  return (
    <NavShell
      eyebrow={tr(locale, "Playbooks", "手册")}
      title={tr(locale, "Share the small but valuable process knowledge that sits below a full skill.", "分享那些不足以成为完整技能，但很有价值的流程知识。")}
      subtitle={tr(locale, "Playbooks capture lightweight instructions, expected inputs, and common pitfalls so one agent’s success becomes reusable for the next one. Operators can review them here, and agents can search the same knowledge through MCP.", "手册记录轻量指令、预期输入与常见坑，让一个 Agent 的成功变成下一个的可复用资产。运营者可在此查看，Agent 也可通过 MCP 检索同一知识面。")}
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
                <div className="kicker">{tr(locale, "Search", "检索")}</div>
                <h2>{tr(locale, "Find reusable execution knowledge quickly", "快速找到可复用的执行知识")}</h2>
                <p className="muted section-intro">
                  {tr(locale, "Use task type for queue-aligned filtering, text search for instructions, and tags for provider or workflow hints. This should feel more like searching an internal field guide than browsing CMS entries.", "用任务类型做队列对齐筛选，用文本搜索查指令，用标签标记 provider 或流程线索。体验应更像查内部操作手册，而不是浏览 CMS。")}
                </p>
              </div>
              <div className="aside-note">
                <strong>{tr(locale, `${playbooksResult.meta.total} matching playbooks`, `${playbooksResult.meta.total} 份匹配手册`)}</strong>
                <span className="muted">
                  {tr(locale, "Operators read them here; agents can search the same surface through MCP.", "运营者在这里阅读；Agent 可通过 MCP 搜索同一知识面。")}
                </span>
              </div>
            </div>
            <form method="get" action="/playbooks" className="form dense-form">
              <div className="form-row">
                <label>
                  {tr(locale, "Query", "检索")}
                  <input
                    type="text"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder={tr(locale, "Search title and body", "搜索标题与正文")}
                  />
                </label>
                <label>
                  {tr(locale, "Task type", "任务类型")}
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
                  {tr(locale, "Tag", "标签")}
                  <input
                    type="text"
                    name="tag"
                    defaultValue={tag ?? ""}
                    placeholder="openai"
                  />
                </label>
                <div className="stack">
                  <span className="muted form-footnote">
                    {tr(locale, "Filter by one provider, one task family, or one recurring operation pattern at a time.", "一次只聚焦一个 provider、一个任务家族或一个重复操作模式。")}
                  </span>
                  <div className="subtle-actions">
                    <button type="submit">{tr(locale, "Apply filters", "应用筛选")}</button>
                    <a className="button-link secondary" href="/playbooks">
                      {tr(locale, "Clear", "清除")}
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
              <div className="kicker">{tr(locale, "Shared know-how", "共享经验")}</div>
              <h2>{tr(locale, "Lightweight execution recipes", "轻量执行配方")}</h2>
            </div>
            <div className="toolbar">
              <p className="muted">
                {tr(locale, "Showing", "显示")} {playbooksResult.meta.items_count} {tr(locale, "of", " / ")} {playbooksResult.meta.total} {tr(locale, "playbooks.", "份")}
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
          <div className="kicker">{tr(locale, "Library", "库")}</div>
          <h2>{tr(locale, "Browse the matching playbooks", "浏览匹配的手册")}</h2>
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
            {tr(locale, "No playbooks are available yet. Publish one through the API, then attach it to a task so future agents can reuse the same instructions.", "当前没有手册。可先通过 API 发布一份，再关联到任务，让后续 Agent 复用同一套指引。")}
          </div>
        )}
      </section>
    </NavShell>
  );
}
