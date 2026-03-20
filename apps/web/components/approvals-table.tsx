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
  if (approvals.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">Pending approvals</div>
          <h2>Pending approvals</h2>
        </div>
        <div className="empty-state">
          No approval requests are waiting right now. Manual tasks and capabilities will appear
          here as soon as an agent hits a gated runtime action.
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">Pending approvals</div>
        <h2>Pending approvals</h2>
        <p className="muted">
          Review agent runtime requests before they receive proxy access or short-lived leases.
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Status</th>
            <th>Action</th>
            <th>Task</th>
            <th>Capability</th>
            <th>Agent</th>
            <th>Reason</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((approval) => {
            const isPending = approval.status === "pending";

            return (
              <tr key={approval.id}>
                <td>{approval.id}</td>
                <td>{approval.status}</td>
                <td>{approval.action_type}</td>
                <td>{approval.task_id}</td>
                <td>{approval.capability_id}</td>
                <td>{approval.agent_id}</td>
                <td>{approval.reason || "Awaiting operator input"}</td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <form action={approveAction}>
                      <input type="hidden" name="approval_id" value={approval.id} />
                      <input type="hidden" name="next" value="/approvals" />
                      <input type="hidden" name="reason" value="" />
                      <button type="submit" disabled={!isPending}>
                        Approve
                      </button>
                    </form>
                    <form
                      action={rejectAction}
                      style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                    >
                      <input type="hidden" name="approval_id" value={approval.id} />
                      <input type="hidden" name="next" value="/approvals" />
                      <input
                        name="reason"
                        placeholder="Reason for rejection"
                        required
                        disabled={!isPending}
                      />
                      <button type="submit" disabled={!isPending}>
                        Reject
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
