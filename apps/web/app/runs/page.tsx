import { NavShell } from "../../components/nav-shell";
import { RunsTable } from "../../components/runs-table";
import { getCollectionNotice, getRuns } from "../../lib/api";
import { requireManagementSession } from "../../lib/management-session";

export default async function RunsPage() {
  await requireManagementSession("/runs");
  const runsResult = await getRuns();
  const runs = runsResult.items;
  const runsNotice = getCollectionNotice(runsResult, "runs");

  return (
    <NavShell
      eyebrow="Runs"
      title="Keep a durable trace of how work was completed."
      subtitle="Runs are more than logs. They become the historical layer that helps another agent complete similar work faster and with fewer mistakes."
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
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel feature-panel stack">
            <div className="section-intro-grid">
              <div>
                <div className="kicker">Audit trail</div>
                <h2>Keep a clean historical layer for repeats and postmortems.</h2>
                <p className="muted section-intro">
                  Runs should read like a compact ledger: what task was executed, who executed it,
                  and what result was recorded. Treat this as your reusable trace layer.
                </p>
              </div>
              <div className="aside-note">
                <strong>{runs.length === 0 ? "No runs yet" : `${runs.length} recorded runs`}</strong>
                <span className="muted">
                  When a run becomes a repeatable pattern, turn it into a playbook.
                </span>
              </div>
            </div>
          </section>
          <RunsTable runs={runs} />
        </div>
        <div className="workspace-side">
          <section className="panel stack">
            <div>
              <div className="kicker">Operator note</div>
              <h2>Store just enough output to be useful</h2>
              <p className="muted">
                Prefer short summaries and structured payloads. Avoid storing sensitive secret
                material in run output.
              </p>
            </div>
          </section>
        </div>
      </div>
    </NavShell>
  );
}
