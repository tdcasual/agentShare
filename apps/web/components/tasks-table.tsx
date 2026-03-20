type TaskRow = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  lease_allowed: boolean;
  approval_mode: string;
};

export function TasksTable({ tasks }: { tasks: TaskRow[] }) {
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
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Type</th>
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
              <td>{task.status}</td>
              <td>{task.approval_mode === "manual" ? "Manual review" : "Auto"}</td>
              <td>{task.lease_allowed ? "Allowed" : "Proxy only"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
