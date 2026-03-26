import { approveApprovalAction, rejectApprovalAction } from "../actions";
import { ApprovalsTable } from "../../components/approvals-table";
import { NavShell } from "../../components/nav-shell";
import { getApprovals, getCollectionNotice } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
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
  const locale = await getLocale();
  const approvalsResult = await getApprovals("pending");
  const pendingCount = approvalsResult.items.length;
  const approvalsNotice = getCollectionNotice(approvalsResult, tr(locale, "approvals", "审批"), locale);
  const updated = readSingleParam(params, "updated");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow={tr(locale, "Approvals", "审批")}
      title={tr(locale, "Review gated runtime actions before agents cross a higher-risk boundary.", "在 Agent 跨越更高风险边界前，复核受控运行时动作。")}
      subtitle={tr(locale, "Manual capabilities and tasks surface here as a compact queue so operators can approve or reject work without leaving the console.", "需要人工复核的能力与任务会汇总在这里，方便运营者直接批准或拒绝。")}
      activeHref="/approvals"
    >
      {updated ? (
        <section className="notice success" role="status">
          {tr(locale, "Approval updated:", "审批已更新：")} <strong>{updated}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "missing-reason"
            ? tr(locale, "A rejection reason is required.", "拒绝必须填写原因。")
            : error === "missing-approval"
              ? tr(locale, "The selected approval request is missing.", "所选审批请求不存在。")
              : error === "management-auth"
                ? tr(locale, "The management session is missing or expired.", "管理会话缺失或已过期。")
                : error === "api-disconnected"
                  ? tr(locale, "The API base URL is not configured, so approvals cannot be reviewed.", "未配置 API Base URL，无法处理审批。")
                  : tr(locale, "The approval decision could not be saved.", "审批结果保存失败。")}
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
      <div className="workspace-grid workspace-grid-priority">
        <div className="workspace-main">
          <ApprovalsTable
            approvals={approvalsResult.items}
            approveAction={approveApprovalAction}
            rejectAction={rejectApprovalAction}
            locale={locale}
          />
        </div>
        <div className="workspace-side">
          <section className="panel compact-panel stack">
            <div className="stack stack-tight">
              <div className="kicker">{tr(locale, "Review queue", "复核队列")}</div>
              <h2>{tr(locale, "Keep decisions fast, contextual, and auditable.", "让每次审批都足够快、带上下文、可追踪。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Approve when a request matches intent and policy. Reject with a reason when the requested boundary is unclear or too broad.",
                  "当请求与意图和策略一致时批准；当边界不清晰或范围过宽时，带原因拒绝。",
                )}
              </p>
            </div>
            <div className="stat-inline-row">
              <div className="stat-inline">
                <span>{tr(locale, "Pending", "待处理")}</span>
                <strong>{pendingCount}</strong>
              </div>
              <div className="stat-inline">
                <span>{tr(locale, "Policy reason", "策略原因")}</span>
                <strong>{tr(locale, "Visible", "可见")}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </NavShell>
  );
}
