import { approveApprovalAction, rejectApprovalAction } from "../actions";
import { ApprovalsTable } from "../../components/approvals-table";
import { NavShell } from "../../components/nav-shell";
import { getApprovals, getCollectionNotice } from "../../lib/api";
import { requireManagementSession } from "../../lib/management-session";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  await requireManagementSession("/approvals");
  const params = (await searchParams) ?? {};
  const approvalsResult = await getApprovals("pending");
  const approvalsNotice = getCollectionNotice(approvalsResult, "approvals");
  const updated = readSingleParam(params, "updated");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Approvals"
      title="Review gated runtime actions before agents cross a higher-risk boundary."
      subtitle="Manual capabilities and tasks surface here as a compact queue so operators can approve or reject work without leaving the console."
      activeHref="/approvals"
    >
      {updated ? (
        <section className="notice success" role="status">
          Approval updated: <strong>{updated}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "missing-reason"
            ? "A rejection reason is required."
            : error === "missing-approval"
              ? "The selected approval request is missing."
              : error === "management-auth"
                ? "The management session is missing or expired."
                : error === "api-disconnected"
                  ? "The API base URL is not configured, so approvals cannot be reviewed."
                  : "The approval decision could not be saved."}
        </section>
      ) : null}
      <section
        className={
          approvalsNotice.tone === "success"
            ? "notice success"
            : approvalsNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={approvalsNotice.tone === "error" ? "alert" : "status"}
      >
        {approvalsNotice.message}
      </section>
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel feature-panel stack">
            <div className="section-intro-grid">
              <div>
                <div className="kicker">Policy flow</div>
                <h2>See exactly why a runtime request stopped here.</h2>
                <p className="muted section-intro">
                  Approval should never feel mysterious. The queue exists to show which rule fired,
                  what action is blocked, and what an operator is about to approve.
                </p>
              </div>
              <div className="aside-note">
                <strong>{approvalsResult.items.length === 0 ? "Queue is clear" : `${approvalsResult.items.length} pending decisions`}</strong>
                <span className="muted">
                  Deny, manual, and allow are resolved before approval mode fallback, so the reason
                  shown here matters.
                </span>
              </div>
            </div>
          </section>
        </div>
        <div className="workspace-side">
          <section className="panel stack">
            <div>
              <div className="kicker">Review posture</div>
              <h2>Approve only what the task and policy actually justify</h2>
              <p className="muted">
                The fastest safe review is the one where policy reason, source, task, and
                capability are all readable without leaving the page.
              </p>
            </div>
          </section>
        </div>
      </div>
      <ApprovalsTable
        approvals={approvalsResult.items}
        approveAction={approveApprovalAction}
        rejectAction={rejectApprovalAction}
      />
    </NavShell>
  );
}
