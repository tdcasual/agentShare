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
  if (tasks.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">Work queue</div>
          <h2>Publish lightweight tasks for agents to claim</h2>
        </div>
        <div className="empty-state">
          No tasks are queued yet. Start with one narrow task that names the capability it depends
          on.
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">Work queue</div>
        <h2>Publish lightweight tasks for agents to claim</h2>
        <p className="muted">
          Each row should be understandable without source diving: what work it is, which playbooks
          support it, whether approval is required, and whether leases are allowed.
        </p>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Type</th>
              <th>Playbooks</th>
              <th>Status</th>
              <th>Approval</th>
              <th>Lease</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.task_type}</td>
                <td>
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
                    <span className="muted">None</span>
                  )}
                </td>
                <td>{task.status}</td>
                <td>{task.approval_mode === "manual" ? "Manual review" : "Auto"}</td>
                <td>{task.lease_allowed ? "Allowed" : "Proxy only"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
