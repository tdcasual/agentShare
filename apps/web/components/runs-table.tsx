import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";
import { agentLabel, taskStatusLabel } from "../lib/ui";

type RunRow = {
  id: string;
  task_id: string;
  agent_id: string;
  status: string;
  result_summary: string;
};

export function RunsTable({ runs, locale = "en" }: { runs: RunRow[]; locale?: Locale }) {
  const statusLabel = (status: string) => {
    return taskStatusLabel(locale, status);
  };

  if (runs.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">{tr(locale, "Audit trail", "审计轨迹")}</div>
          <h2>{tr(locale, "No recorded runs yet", "当前还没有运行记录")}</h2>
        </div>
        <div className="empty-state">
          {tr(locale, "Once tasks are executed, their results will be recorded here for later review and reuse.", "任务开始执行后，结果会记录在这里，方便后续回看与复用。")}
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "Audit trail", "审计轨迹")}</div>
        <h2>{tr(locale, "Every execution leaves a reusable trace", "每次执行都会留下可复用的痕迹")}</h2>
      </div>
      <div className="table-wrap table-desktop">
        <table className="table">
          <thead>
            <tr>
              <th>{tr(locale, "Run", "运行")}</th>
              <th>{tr(locale, "Task", "任务")}</th>
              <th>{agentLabel(locale)}</th>
              <th>{tr(locale, "Status", "状态")}</th>
              <th>{tr(locale, "Summary", "摘要")}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td title={run.id}>{run.id}</td>
                <td title={run.task_id}>{run.task_id}</td>
                <td title={run.agent_id}>{run.agent_id}</td>
                <td>{statusLabel(run.status)}</td>
                <td>{run.result_summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="list table-mobile" aria-label="Run list">
        {runs.map((run) => (
          <article key={run.id} className="list-item stack">
            <div className="chip-row">
              <span className="chip">{statusLabel(run.status)}</span>
              <span className="chip truncate-text" title={run.id}>{run.id}</span>
            </div>
            <div className="stack stack-tight">
              <strong>{run.result_summary || tr(locale, "No summary provided", "未提供摘要")}</strong>
              <span className="muted truncate-text" title={run.task_id}>
                {tr(locale, "Task", "任务")} {run.task_id}
              </span>
              <span className="muted truncate-text" title={run.agent_id}>
                {agentLabel(locale)} {run.agent_id}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
