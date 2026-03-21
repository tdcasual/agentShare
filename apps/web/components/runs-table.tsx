type RunRow = {
  id: string;
  task_id: string;
  agent_id: string;
  status: string;
  result_summary: string;
};

export function RunsTable({ runs }: { runs: RunRow[] }) {
  return (
    <section className="panel stack">
      <div>
        <div className="kicker">Audit trail</div>
        <h2>Every execution leaves a reusable trace</h2>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Task</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Summary</th>
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
