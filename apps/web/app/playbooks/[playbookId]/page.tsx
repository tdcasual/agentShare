import { NavShell } from "../../../components/nav-shell";
import { getPlaybookById } from "../../../lib/api";
import { getLocale } from "../../../lib/i18n-server";
import { tr } from "../../../lib/i18n-shared";
import { requireManagementSession } from "../../../lib/management-session";

type PageProps = {
  params: Promise<{ playbookId: string }>;
};

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { playbookId } = await params;
  await requireManagementSession(`/playbooks/${encodeURIComponent(playbookId)}`);
  const locale = await getLocale();

  const result = await getPlaybookById(playbookId);
  const playbook = result.item;

  return (
    <NavShell
      eyebrow={tr(locale, "Playbook detail", "手册详情")}
      title={playbook ? playbook.title : tr(locale, "Playbook not found", "手册不存在")}
      subtitle={tr(locale, "Review the complete instructions before running higher-risk or repetitive workflows.", "在运行高风险或重复流程前，请先完整阅读指引。")}
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
            <h2>{tr(locale, "Instructions", "指引")}</h2>
            <p>{playbook.body}</p>
          </article>
          <a className="button-link" href="/playbooks">
            {tr(locale, "Back to playbooks", "返回手册列表")}
          </a>
        </section>
      ) : (
        <section className="panel stack">
          <div className="kicker">{tr(locale, "Missing record", "记录缺失")}</div>
          <h2>{tr(locale, "That playbook is unavailable.", "该手册不可用。")}</h2>
          <p className="muted">
            {result.error ?? tr(locale, "The requested playbook could not be loaded.", "无法加载请求的手册。")}
          </p>
          <a className="button-link" href="/playbooks">
            {tr(locale, "Back to playbooks", "返回手册列表")}
          </a>
        </section>
      )}
    </NavShell>
  );
}
