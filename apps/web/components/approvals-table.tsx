import type { ApprovalRequest } from "../lib/api";

type ApprovalsTableProps = {
  approvals: ApprovalRequest[];
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
};

export function ApprovalsTable({
  approvals,
  approveAction,
  rejectAction,
}: ApprovalsTableProps) {
  const statusTone = (status: string) => {
    if (status === "approved") return "success";
    if (status === "rejected") return "error";
    if (status === "pending") return "accent";
    return "muted";
  };

  if (approvals.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">Pending approvals</div>
          <h2>Pending approvals</h2>
        </div>
        <div className="empty-state">
          No approval requests waiting right now. They appear as soon as an agent hits a gated action.
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">Pending approvals</div>
        <h2>Pending approvals</h2>
      </div>
      <div className="list">
        {approvals.map((approval) => {
          const isPending = approval.status === "pending";
          const policyLine = approval.policy_reason || "No policy reason recorded";

          return (
            <article
              key={approval.id}
              data-testid="approval-card"
              className="list-item approval-card"
            >
              <div className="chip-row">
                <span className="chip" data-tone={statusTone(approval.status)}>
                  {approval.status}
                </span>
                <span className="chip">{approval.action_type}</span>
                {approval.policy_source ? <span className="chip">{approval.policy_source}</span> : null}
              </div>
              <div className="stack">
                <strong>{policyLine}</strong>
                <span className="muted">
                  {approval.reason || "Awaiting operator input."}
                </span>
              </div>
              <details className="compact-details">
                <summary>Details</summary>
                <div className="stack">
                  <div className="chip-row">
                    <span className="chip">request {approval.id}</span>
                    <span className="chip">task {approval.task_id}</span>
                    <span className="chip">capability {approval.capability_id}</span>
                    <span className="chip">agent {approval.agent_id}</span>
                  </div>
                </div>
              </details>
              <div className="inline-actions">
                <form action={approveAction}>
                  <input type="hidden" name="approval_id" value={approval.id} />
                  <input type="hidden" name="next" value="/approvals" />
                  <input type="hidden" name="reason" value="" />
                  <button type="submit" disabled={!isPending}>
                    Approve
                  </button>
                </form>
                <details className="compact-details">
                  <summary>Reject</summary>
                  <form action={rejectAction} className="stack">
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="next" value="/approvals" />
                    <label>
                      Reason
                      <input
                        name="reason"
                        placeholder="Reason for rejection"
                        required
                        disabled={!isPending}
                      />
                    </label>
                    <button type="submit" disabled={!isPending}>
                      Confirm rejection
                    </button>
                  </form>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
