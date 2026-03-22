import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

type RunRow = {
  id: string;
  task_id: string;
  agent_id: string;
  status: string;
  result_summary: string;
};

export function RunsTable({ runs, locale = "en" }: { runs: RunRow[]; locale?: Locale }) {
  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "Audit trail", "审计轨迹")}</div>
        <h2>{tr(locale, "Every execution leaves a reusable trace", "每次执行都会留下可复用的痕迹")}</h2>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{tr(locale, "Run", "Run")}</th>
              <th>{tr(locale, "Task", "任务")}</th>
              <th>{tr(locale, "Agent", "Agent")}</th>
              <th>{tr(locale, "Status", "状态")}</th>
              <th>{tr(locale, "Summary", "摘要")}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{run.id}</td>
                <td>{run.task_id}</td>
                <td>{run.agent_id}</td>
                <td>{run.status}</td>
                <td>{run.result_summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
