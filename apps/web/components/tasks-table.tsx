import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

type TaskRow = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  lease_allowed: boolean;
  approval_mode: string;
  playbook_ids: string[];
};

type PlaybookLinkMap = Map<string, { title: string }>;

export function TasksTable(
  {
    tasks,
    playbookLinks = new Map(),
    locale = "en",
  }: { tasks: TaskRow[]; playbookLinks?: PlaybookLinkMap; locale?: Locale },
) {
  const statusTone = (status: string) => {
    if (status === "completed") return "success";
    if (status === "claimed") return "accent";
    return "muted";
  };

  if (tasks.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">{tr(locale, "Work queue", "任务队列")}</div>
          <h2>{tr(locale, "Publish lightweight tasks for agents to claim", "发布可被 Agent 认领的轻量任务")}</h2>
        </div>
        <div className="empty-state">
          {tr(
            locale,
            "No tasks yet. Start with one narrow task and link a playbook if it needs nuance.",
            "当前没有任务。先发布一个足够窄的任务，需要细节就关联一份手册。",
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "Work queue", "任务队列")}</div>
        <h2>{tr(locale, "Publish lightweight tasks for agents to claim", "发布可被 Agent 认领的轻量任务")}</h2>
      </div>
      <ul className="list" aria-label="Task queue">
        {tasks.map((task) => (
          <li key={task.id} data-testid="task-card" className="list-item task-card">
            <div className="chip-row">
              <span className="chip" data-tone={statusTone(task.status)}>
                {task.status}
              </span>
              <span className="chip">{task.task_type}</span>
              <span className="chip">{task.approval_mode === "manual" ? "manual" : "auto"}</span>
              {task.lease_allowed ? (
                <span className="chip">lease</span>
              ) : (
                <span className="chip">proxy</span>
              )}
            </div>
            <div className="stack">
              <strong>{task.title}</strong>
              <span className="muted">{task.id}</span>
            </div>
            {task.playbook_ids.length > 0 ? (
              <div className="chip-row">
                {task.playbook_ids.map((playbookId) => {
                  const playbook = playbookLinks.get(playbookId);
                  const label = playbook?.title ?? playbookId;
                  return (
                    <a key={playbookId} className="chip" href={`/playbooks/${playbookId}`}>
                      {label}
                    </a>
                  );
                })}
              </div>
            ) : (
              <span className="muted">{tr(locale, "No playbooks attached.", "未关联手册。")}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
