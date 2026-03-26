import { NavShell } from "../../components/nav-shell";
import { RunsTable } from "../../components/runs-table";
import { getCollectionNotice, getRuns } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { requireManagementSession } from "../../lib/management-session";

export default async function RunsPage() {
  await requireManagementSession("/runs");
  const locale = await getLocale();
  const runsResult = await getRuns();
  const runs = runsResult.items;
  const completedCount = runs.filter((run) => run.status === "completed").length;
  const runsNotice = getCollectionNotice(runsResult, tr(locale, "runs", "运行记录"), locale);

  return (
    <NavShell
      eyebrow={tr(locale, "Runs", "运行记录")}
      title={tr(locale, "Keep a durable trace of how work was completed.", "保留工作如何完成的持久痕迹。")}
      subtitle={tr(locale, "Runs are more than logs. They become the historical layer that helps another agent complete similar work faster and with fewer mistakes.", "Runs 不只是日志，它们是历史层，帮助下一个 Agent 更快、更少错误地完成类似工作。")}
      activeHref="/runs"
    >
      <section
        className={
          runsNotice.tone === "success"
            ? "notice success"
            : runsNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={runsNotice.tone === "error" ? "alert" : "status"}
      >
        {runsNotice.message}
      </section>
      <div className="workspace-grid workspace-grid-priority">
        <div className="workspace-main">
          <RunsTable runs={runs} locale={locale} />
        </div>
        <div className="workspace-side">
          <section className="panel compact-panel stack">
            <div>
              <div className="kicker">{tr(locale, "Audit trail", "审计轨迹")}</div>
              <h2>{tr(locale, "Keep a clean trace layer for repeats and postmortems.", "为重复执行和复盘保留一层干净轨迹。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Runs should read like a compact ledger: what happened, who ran it, and what result is safe to reuse later.",
                  "Runs 应该像一份紧凑账本：发生了什么、谁执行的、哪些结果适合后续复用。",
                )}
              </p>
            </div>
            <div className="stat-inline-row">
              <div className="stat-inline">
                <span>{tr(locale, "Total runs", "运行总数")}</span>
                <strong>{runs.length}</strong>
              </div>
              <div className="stat-inline">
                <span>{tr(locale, "Completed", "已完成")}</span>
                <strong>{completedCount}</strong>
              </div>
            </div>
          </section>
          <section className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Operator note", "运营提示")}</div>
              <h2>{tr(locale, "Store just enough output to stay useful.", "只保留足够有用的输出。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Prefer short summaries and structured payloads. Avoid storing raw secret material in run output.",
                  "优先保留简短摘要和结构化输出，避免在运行结果中存放原始敏感信息。",
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </NavShell>
  );
}
