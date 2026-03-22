import Link from "next/link";

import { NavShell } from "../components/nav-shell";
import { getApiBaseUrl } from "../lib/api";
import { getLocale } from "../lib/i18n-server";
import { tr } from "../lib/i18n-shared";

const highlights = [
  {
    label: { en: "Playbook search", zh: "手册检索" },
    value: { en: "Ready", zh: "就绪" },
    note: { en: "Find reusable guidance by task type, text, and tag.", zh: "按任务类型、关键词与标签检索可复用的操作指引。" },
  },
  {
    label: { en: "Policy-backed approvals", zh: "策略审批" },
    value: { en: "Live", zh: "启用" },
    note: { en: "Runtime actions can allow, require review, or deny.", zh: "运行时动作可以放行、要求人工复核或直接拒绝。" },
  },
  {
    label: { en: "MCP tools", zh: "MCP 工具" },
    value: { en: "6", zh: "6" },
    note: { en: "Expose task, playbook, invoke, and lease operations to agents.", zh: "把任务、手册、调用与租约等操作暴露给 Agent。" },
  },
];

export default async function HomePage() {
  const apiBaseUrl = getApiBaseUrl();
  const locale = await getLocale();

  return (
    <NavShell
      eyebrow={tr(locale, "Control plane", "控制平面")}
      title={tr(locale, "Coordinate humans, agents, secrets, and lightweight work in one place.", "把人、Agent、密钥与轻量任务统一协调。")}
      subtitle={tr(
        locale,
        "This dashboard is built for the model you chose: proxy-by-default capability execution, short-lived secret leases only when needed, and task-first collaboration for agents.",
        "这里遵循你选择的运行模型：默认代理调用能力，仅在需要时发放短租约，并以任务为中心协作。",
      )}
      activeHref="/"
    >
      <section className="hero-grid">
        <article className="panel feature-panel stack">
          <div className="section-intro-grid">
            <div className="stack">
              <div className="kicker">{tr(locale, "Operational overview", "运行概览")}</div>
              <h2>
                {tr(
                  locale,
                  "Run sensitive agent work through one deliberate, policy-shaped surface.",
                  "用一套可解释的策略界面承载敏感 Agent 工作流。",
                )}
              </h2>
              <p className="muted section-intro">
                {tr(
                  locale,
                  "The control plane is at its best when humans set trust boundaries once and agents execute cleanly inside them. Secrets stay abstracted, approvals stay explainable, and reusable context stays close to the task.",
                  "控制平面的价值在于：人类一次性设定信任边界，Agent 在边界内稳定执行。密钥保持抽象、审批保持可解释、可复用的上下文紧贴任务本身。",
                )}
              </p>
              <div className="subtle-actions">
                <Link className="button-link" href="/tasks">
                  {tr(locale, "Open task queue", "打开任务队列")}
                </Link>
                <Link className="button-link secondary" href="/approvals">
                  {tr(locale, "Open review queue", "打开审批队列")}
                </Link>
              </div>
            </div>
            <div className="aside-note">
              <strong>{tr(locale, "Phase 2 is now coherent", "Phase 2 已打通")}</strong>
              <span className="muted">
                {tr(
                  locale,
                  "Knowledge, policy, adapters, and MCP are all visible in one console instead of hiding behind docs and API routes.",
                  "知识、策略、适配器与 MCP 都在同一个控制台可见，不再散落在文档与接口里。",
                )}
              </span>
            </div>
          </div>
        </article>
        {highlights.map((item) => (
          <article key={item.label.en} className="card">
            <div className="kicker">{tr(locale, item.label.en, item.label.zh)}</div>
            <div className="metric">{tr(locale, item.value.en, item.value.zh)}</div>
            <p className="muted">{tr(locale, item.note.en, item.note.zh)}</p>
          </article>
        ))}
      </section>
      <section className="grid section-space">
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Start with trust", "从信任边界开始")}</div>
            <h2>{tr(locale, "Capture secrets in the console, not in chat threads", "在控制台登记密钥，不要在聊天里粘贴")}</h2>
            <p className="muted">
              {tr(
                locale,
                "Keep sensitive credentials in the backend vault and expose them through named capabilities that agents can safely invoke.",
                "把敏感凭据存入后端密钥仓库，并通过命名能力对外暴露，让 Agent 在策略约束下安全调用。",
              )}
            </p>
          </div>
          <Link className="button-link" href="/secrets">
            {tr(locale, "Manage secrets", "管理密钥")}
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Queue work", "发布任务")}</div>
            <h2>{tr(locale, "Publish lightweight tasks that agents can claim and complete", "发布可认领、可完成的轻量任务")}</h2>
            <p className="muted">
              {tr(
                locale,
                "Tasks reference capabilities instead of raw tokens, so the control plane stays in the middle of every sensitive action. Attach playbooks when a task needs reusable operator guidance instead of one-off instructions.",
                "任务引用能力而不是原始 token，让控制平面始终处在每次敏感动作的中间层。需要可复用的操作指引时附上手册，而不是写一次性的指令。",
              )}
            </p>
          </div>
          <Link className="button-link secondary" href="/tasks">
            {tr(locale, "Open tasks", "打开任务")}
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Keep context reusable", "让上下文可复用")}</div>
            <h2>{tr(locale, "Turn good runs into playbooks and keep approvals close by", "把高质量运行沉淀成手册，把审批放在手边")}</h2>
            <p className="muted">
              {tr(
                locale,
                "Operators should be able to find reusable execution guidance and review higher-risk actions without digging through source or logs.",
                "运营者应当能在不翻源码、不挖日志的情况下，找到可复用的执行指引并复核高风险动作。",
              )}
            </p>
          </div>
          <div className="chip-row">
            <Link className="button-link" href="/playbooks">
              {tr(locale, "Browse playbooks", "浏览手册")}
            </Link>
            <Link className="button-link secondary" href="/approvals">
              {tr(locale, "Review approvals", "处理审批")}
            </Link>
          </div>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Choose the right adapter", "选择合适的适配器")}</div>
            <h2>{tr(locale, "Use the narrowest capability contract that matches the upstream system", "用最窄的能力契约匹配上游系统")}</h2>
            <p className="muted">
              {tr(locale, "Pick ", "优先选择 ")}
              <strong>openai</strong>
              {tr(locale, " for chat completions, ", " 处理对话调用，")}
              <strong>github</strong>
              {tr(locale, " for repository-scoped REST calls, and ", " 处理仓库范围的 REST 调用，")}
              <strong>generic_http</strong>
              {tr(locale, " only when no first-class adapter exists yet.", " 仅在没有一等适配器时使用。")}
            </p>
          </div>
          <Link className="button-link secondary" href="/capabilities">
            {tr(locale, "Compare adapters", "查看能力")}
          </Link>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Self-serve onboarding", "自助上手")}</div>
            <h2>{tr(locale, "Start from HTTP or MCP, then confirm details in machine-readable contracts", "先走通 HTTP 或 MCP，再用契约确认细节")}</h2>
            <p className="muted">
              {tr(
                locale,
                "New integrators should follow the quickstart first, choose the transport they need, then treat Swagger and OpenAPI as the source of truth for request and response contracts.",
                "新接入者先跟随快速开始走通流程，选择需要的传输方式，然后把 Swagger 与 OpenAPI 作为请求响应契约的唯一真相来源。",
              )}
            </p>
          </div>
          <div className="chip-row">
            <Link className="button-link" href="/quickstart">
              {tr(locale, "HTTP quickstart", "HTTP 快速开始")}
            </Link>
            <Link className="button-link secondary" href="/quickstart#mcp-quickstart">
              {tr(locale, "MCP quickstart", "MCP 快速开始")}
            </Link>
            {apiBaseUrl ? (
              <>
                <a className="button-link secondary" href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
                  {tr(locale, "Swagger UI", "Swagger UI")}
                </a>
                <a className="button-link secondary" href={`${apiBaseUrl}/openapi.json`} target="_blank" rel="noreferrer">
                  {tr(locale, "OpenAPI JSON", "OpenAPI JSON")}
                </a>
              </>
            ) : null}
          </div>
        </article>
      </section>
    </NavShell>
  );
}
