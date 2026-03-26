import type { ApprovalRequest } from "../lib/api";
import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";
import { actionTypeLabel, agentLabel, approvalStatusLabel } from "../lib/ui";

type ApprovalsTableProps = {
  approvals: ApprovalRequest[];
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
  locale?: Locale;
};

export function ApprovalsTable({
  approvals,
  approveAction,
  rejectAction,
  locale = "en",
}: ApprovalsTableProps) {
  const statusTone = (status: string) => {
    if (status === "approved") return "success";
    if (status === "rejected") return "error";
    if (status === "pending") return "accent";
    return "muted";
  };

  const statusLabel = (status: string) => {
    return approvalStatusLabel(locale, status);
  };

  if (approvals.length === 0) {
    return (
      <section className="panel stack">
        <div>
          <div className="kicker">{tr(locale, "Pending approvals", "待审批")}</div>
          <h2>{tr(locale, "Pending approvals", "待审批")}</h2>
        </div>
        <div className="empty-state">
          {tr(
            locale,
            "No approval requests waiting right now. They appear as soon as an agent hits a gated action.",
            "当前没有待审批请求。Agent 触发受控动作后会出现在这里。",
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "Pending approvals", "待审批")}</div>
        <h2>{tr(locale, "Pending approvals", "待审批")}</h2>
      </div>
      <div className="list">
        {approvals.map((approval) => {
          const isPending = approval.status === "pending";
          const policyLine =
            approval.policy_reason || tr(locale, "No policy reason recorded", "未记录策略原因");

          return (
            <article
              key={approval.id}
              data-testid="approval-card"
              className="list-item approval-card"
            >
              <div className="chip-row">
                <span className="chip" data-tone={statusTone(approval.status)}>
                  {statusLabel(approval.status)}
                </span>
                <span className="chip">{actionTypeLabel(locale, approval.action_type)}</span>
                {approval.policy_source ? <span className="chip">{approval.policy_source}</span> : null}
              </div>
              <div className="stack">
                <strong>{policyLine}</strong>
                <span className="muted">
                  {approval.reason || tr(locale, "Awaiting operator input.", "等待运营者处理。")}
                </span>
              </div>
              <details className="compact-details">
                <summary>{tr(locale, "Details", "详情")}</summary>
                <div className="stack">
                  <div className="chip-row">
                    <span className="chip truncate-text" title={approval.id}>
                      {tr(locale, "Request", "请求")} {approval.id}
                    </span>
                    <span className="chip truncate-text" title={approval.task_id}>
                      {tr(locale, "Task", "任务")} {approval.task_id}
                    </span>
                    <span className="chip truncate-text" title={approval.capability_id}>
                      {tr(locale, "Capability", "能力")} {approval.capability_id}
                    </span>
                    <span className="chip truncate-text" title={approval.agent_id}>
                      {agentLabel(locale)} {approval.agent_id}
                    </span>
                  </div>
                </div>
              </details>
              <div className="inline-actions">
                <form action={approveAction}>
                  <input type="hidden" name="approval_id" value={approval.id} />
                  <input type="hidden" name="next" value="/approvals" />
                  <input type="hidden" name="reason" value="" />
                  <button type="submit" disabled={!isPending}>
                    {tr(locale, "Approve", "批准")}
                  </button>
                </form>
                <details className="compact-details">
                  <summary>{tr(locale, "Reject", "拒绝")}</summary>
                  <form action={rejectAction} className="stack">
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="next" value="/approvals" />
                    <label>
                      {tr(locale, "Reason", "原因")}
                      <input
                        name="reason"
                        placeholder={tr(locale, "Reason for rejection", "拒绝原因")}
                        required
                        disabled={!isPending}
                      />
                    </label>
                    <button type="submit" disabled={!isPending}>
                      {tr(locale, "Confirm rejection", "确认拒绝")}
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
