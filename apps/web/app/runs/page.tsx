import { NavShell } from "../../components/nav-shell";
import { RunsTable } from "../../components/runs-table";
import { getCollectionNotice, getRuns } from "../../lib/api";

export default async function RunsPage() {
  const runsResult = await getRuns();
  const runs = runsResult.items;
  const runsNotice = getCollectionNotice(runsResult, "runs");

  return (
    <NavShell
      eyebrow="Runs"
      title="Keep a durable trace of how work was completed."
      subtitle="Runs are more than logs. They become the historical layer that helps another agent complete similar work faster and with fewer mistakes."
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
      <RunsTable runs={runs} />
    </NavShell>
  );
}
