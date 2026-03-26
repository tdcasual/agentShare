import Link from "next/link";

import { NavShell } from "../components/nav-shell";
import { getApiBaseUrl } from "../lib/api";
import { getLocale } from "../lib/i18n-server";
import { tr } from "../lib/i18n-shared";
import { agentSelfServeLabel, docsLabel } from "../lib/ui";

const highlights = [
  {
    label: { en: "Playbook search", zh: "手册检索" },
    value: { en: "Ready", zh: "就绪" },
    note: { en: "Search by task family, free text, and tags.", zh: "支持按任务类型、关键词和标签检索。" },
  },
  {
    label: { en: "Policy-backed approvals", zh: "策略审批" },
    value: { en: "Live", zh: "启用" },
    note: { en: "Runtime actions can allow, pause for review, or deny.", zh: "运行时动作可自动放行、转人工复核或直接拒绝。" },
  },
  {
    label: { en: "Agent entry points", zh: "Agent 入口" },
    value: { en: "HTTP + MCP", zh: "HTTP + MCP" },
    note: { en: "One human console, two machine-friendly paths.", zh: "一套人类控制台，两条机器友好入口。" },
  },
];

const operatorFlow = [
  {
    title: { en: "Register one secret reference", zh: "先登记一条密钥引用" },
    note: { en: "Store raw credentials in the backend vault, then keep only the reference in the console.", zh: "把原始凭据放在后端密钥仓库里，控制台只保留引用与上下文。" },
  },
  {
    title: { en: "Bind a capability with narrow scope", zh: "再绑定一条收敛能力" },
    note: { en: "Choose the smallest adapter contract that matches the upstream system and the least risky execution mode.", zh: "选择最贴近上游系统、且风险最小的适配器契约与执行模式。" },
  },
  {
    title: { en: "Queue a task and keep approvals nearby", zh: "然后发布任务并把审批放近" },
    note: { en: "Tasks, approvals, and runs should stay close enough that operators can review without context switching.", zh: "任务、审批与运行记录应保持足够接近，方便运营者不切上下文就完成判断。" },
  },
];

export default async function HomePage() {
  const apiBaseUrl = getApiBaseUrl();
  const locale = await getLocale();

  return (
    <NavShell
      variant="hero"
      eyebrow={tr(locale, "Control plane", "控制平面")}
      title={tr(locale, "Coordinate humans, agents, secrets, and lightweight work in one place.", "把人、Agent、密钥与轻量任务统一协调。")}
      subtitle={tr(
        locale,
        "This dashboard is built for the model you chose: proxy-by-default capability execution, short-lived secret leases only when needed, and task-first collaboration for agents.",
        "这里遵循你选择的运行模型：默认代理调用能力，仅在需要时发放短租约，并以任务为中心协作。",
      )}
      activeHref="/"
      headerActions={
        <div className="subtle-actions">
          <Link className="button-link" href="/tasks">
            {tr(locale, "Open task queue", "打开任务队列")}
          </Link>
          <Link className="button-link secondary" href="/quickstart">
            {tr(locale, "Read quickstart", "查看快速开始")}
          </Link>
        </div>
      }
    >
      <section className="dashboard-stage">
        <article className="panel feature-panel dashboard-primary stack">
          <div>
            <div className="kicker">{tr(locale, "Start here", "从这里开始")}</div>
            <h2>
              {tr(
                locale,
                "Set trust boundaries once, then let agents move cleanly inside them.",
                "先定义好信任边界，再让 Agent 在边界内稳定执行。",
              )}
            </h2>
            <p className="muted section-intro">
              {tr(
                locale,
                "The fastest path to a reliable setup is simple: hide raw secrets behind references, bind a narrow capability, then queue one clear task with approvals close by.",
                "最快跑通一套可靠流程的方式其实很简单：先把原始密钥藏到引用之后，再绑定一条收敛能力，最后发布一个清晰任务，并把审批放在旁边。",
              )}
            </p>
          </div>
          <div className="hero-stat-grid">
            {highlights.map((item) => (
              <div key={item.label.en} className="stat-tile">
                <span className="stat-label">{tr(locale, item.label.en, item.label.zh)}</span>
                <div className="metric">{tr(locale, item.value.en, item.value.zh)}</div>
                <p className="muted">{tr(locale, item.note.en, item.note.zh)}</p>
              </div>
            ))}
          </div>
        </article>
        <aside className="panel dashboard-guide stack">
          <div>
            <div className="kicker">{tr(locale, "Operator flow", "运营路径")}</div>
            <h2>{tr(locale, "Use one repeatable path instead of ad-hoc chat coordination.", "尽量使用一条可重复路径，而不是临时聊天协调。")}</h2>
          </div>
          <ol className="process-list">
            {operatorFlow.map((step, index) => (
              <li key={step.title.en} className="process-step">
                <span className="process-index">{index + 1}</span>
                <div className="stack stack-tight">
                  <strong>{tr(locale, step.title.en, step.title.zh)}</strong>
                  <p className="muted">{tr(locale, step.note.en, step.note.zh)}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>
      <section className="dashboard-grid section-space">
        <article className="panel stack dashboard-card">
          <div>
            <div className="kicker">{tr(locale, "Build trust", "建立信任边界")}</div>
            <h2>{tr(locale, "Register secrets and capabilities before agents ever touch upstream systems.", "在 Agent 接触上游系统前，先把密钥和能力定义好。")}</h2>
            <p className="muted">
              {tr(
                locale,
                "Keep raw credentials in the backend vault, expose them through named capabilities, and make approval posture visible before work starts.",
                "把原始凭据留在后端密钥仓库里，再通过命名能力暴露给 Agent，并在任务开始前让审批姿态显性化。",
              )}
            </p>
          </div>
          <div className="subtle-actions">
            <Link className="button-link" href="/secrets">
              {tr(locale, "Manage secrets", "管理密钥")}
            </Link>
            <Link className="button-link secondary" href="/capabilities">
              {tr(locale, "Open capabilities", "查看能力")}
            </Link>
          </div>
        </article>
        <article className="panel stack dashboard-card">
          <div>
            <div className="kicker">{tr(locale, "Run work", "运行工作流")}</div>
            <h2>{tr(locale, "Keep the task queue, review queue, and run history within the same operational loop.", "让任务队列、审批队列和运行记录处在同一个操作闭环中。")}</h2>
            <p className="muted">
              {tr(
                locale,
                "Operators should be able to publish, review, and trace work without hunting across logs, source, or separate tools.",
                "运营者应当能在不翻日志、不查源码、不切换工具的前提下完成发布、审批和追踪。",
              )}
            </p>
          </div>
          <div className="subtle-actions">
            <Link className="button-link" href="/tasks">
              {tr(locale, "Open tasks", "打开任务")}
            </Link>
            <Link className="button-link secondary" href="/approvals">
              {tr(locale, "Review approvals", "处理审批")}
            </Link>
            <Link className="button-link secondary" href="/runs">
              {tr(locale, "Open runs", "查看运行记录")}
            </Link>
          </div>
        </article>
        <article className="panel stack dashboard-card">
          <div>
            <div className="kicker">{tr(locale, "Teach agents", "帮助 Agent 上手")}</div>
            <h2>{tr(locale, "Pair quickstart guidance with reusable playbooks so the next run starts smarter.", "把快速开始和可复用手册放在一起，让下一次执行从更高起点开始。")}</h2>
            <p className="muted">
              {tr(
                locale,
                "New integrators should start with one clear guide, then confirm runtime details through machine-readable contracts and searchable execution notes.",
                "新接入者应先跟随一份清晰指南，再通过机器可读契约和可检索执行笔记确认运行细节。",
              )}
            </p>
          </div>
          <div className="subtle-actions">
            <Link className="button-link" href="/playbooks">
              {tr(locale, "Browse playbooks", "浏览手册")}
            </Link>
            <Link className="button-link secondary" href="/quickstart">
              {tr(locale, "Open quickstart", "查看快速开始")}
            </Link>
            <Link className="button-link secondary" href="/agent">
              {agentSelfServeLabel(locale)}
            </Link>
          </div>
        </article>
      </section>
      <section className="panel stack compact-panel section-space">
        <div className="toolbar">
          <div className="stack stack-tight">
            <div className="kicker">{tr(locale, "Platform posture", "平台姿态")}</div>
            <h2>{tr(locale, "Three things this control plane should always keep obvious", "这个控制平面始终要把三件事保持可见")}</h2>
          </div>
          {apiBaseUrl ? (
            <div className="subtle-actions">
              <a className="button-link secondary" href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
                {docsLabel(locale, "swagger")}
              </a>
              <a className="button-link secondary" href={`${apiBaseUrl}/openapi.json`} target="_blank" rel="noreferrer">
                {docsLabel(locale, "openapi")}
              </a>
            </div>
          ) : null}
        </div>
        <div className="signal-list signal-list-inline">
          <div className="signal-item">
            <span>{tr(locale, "Default execution", "默认执行")}</span>
            <strong>{tr(locale, "Proxy-first capability calls", "能力调用默认走代理")}</strong>
          </div>
          <div className="signal-item">
            <span>{tr(locale, "Sensitive access", "敏感访问")}</span>
            <strong>{tr(locale, "Short leases only when strictly needed", "仅在确有必要时发放短租约")}</strong>
          </div>
          <div className="signal-item">
            <span>{tr(locale, "Reusable context", "可复用上下文")}</span>
            <strong>{tr(locale, "Tasks, approvals, and playbooks stay connected", "任务、审批与手册保持联动")}</strong>
          </div>
        </div>
      </section>
    </NavShell>
  );
}
