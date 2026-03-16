import { NavShell } from "../../components/nav-shell";
import { RunsTable } from "../../components/runs-table";
import { getRuns } from "../../lib/api";

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <NavShell
      eyebrow="Runs"
      title="Keep a durable trace of how work was completed."
      subtitle="Runs are more than logs. They become the historical layer that helps another agent complete similar work faster and with fewer mistakes."
    >
      <RunsTable runs={runs} />
    </NavShell>
  );
}
