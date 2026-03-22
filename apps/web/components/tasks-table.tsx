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
  { tasks, playbookLinks = new Map() }: { tasks: TaskRow[]; playbookLinks?: PlaybookLinkMap },
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
          <div className="kicker">Work queue</div>
          <h2>Publish lightweight tasks for agents to claim</h2>
        </div>
        <div className="empty-state">
          No tasks yet. Start with one narrow task and link a playbook if it needs nuance.
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">Work queue</div>
        <h2>Publish lightweight tasks for agents to claim</h2>
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
              <span className="muted">No playbooks attached.</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
