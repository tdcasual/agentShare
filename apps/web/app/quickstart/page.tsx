import Link from "next/link";

import { NavShell } from "../../components/nav-shell";
import { getApiBaseUrl, getApiDocsLinks } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { docsLabel } from "../../lib/ui";

function buildSteps(apiBase: string) {
  return [
    {
      title: { en: "1. Verify agent identity", zh: "1. 验证 Agent 身份" },
      code: `export ACP_BASE_URL=${apiBase}
export ACP_AGENT_KEY=replace-me

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  "$ACP_BASE_URL/api/agents/me"`,
    },
    {
      title: { en: "2. List tasks", zh: "2. 列出任务" },
      code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  "$ACP_BASE_URL/api/tasks"`,
    },
    {
      title: { en: "3. Claim a task", zh: "3. 认领任务" },
      code: `export TASK_ID=task-1

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -X POST \\
  "$ACP_BASE_URL/api/tasks/$TASK_ID/claim"`,
    },
    {
      title: { en: "4. Invoke a capability through proxy mode", zh: "4. 通过代理模式调用能力" },
      code: `export CAPABILITY_ID=capability-1

curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_id":"task-1","parameters":{"prompt":"hello"}}' \\
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/invoke"`,
    },
    {
      title: { en: "5. Request a lease only when proxy mode is not enough", zh: "5. 仅在代理不够时申请租约" },
      code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_id":"task-1","purpose":"git cli access"}' \\
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"`,
    },
    {
      title: { en: "6. Complete the task", zh: "6. 完成任务" },
      code: `curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"result_summary":"Configuration synced","output_payload":{"ok":true}}' \\
  -X POST \\
  "$ACP_BASE_URL/api/tasks/$TASK_ID/complete"`,
    },
  ];
}

const requirements = [
  {
    title: { en: "Agent key", zh: "Agent 访问密钥" },
    note: { en: "Each runtime route uses a per-agent bearer key.", zh: "运行时路由使用每个 Agent 独立的访问令牌。" },
  },
  {
    title: { en: "One claimable task", zh: "一条可认领任务" },
    note: { en: "Keep one narrow task ready before testing invoke or lease flows.", zh: "在测试调用或租约之前，先准备一条足够收敛、可认领的任务。" },
  },
  {
    title: { en: "API docs nearby", zh: "把 API 文档放在手边" },
    note: { en: "Use Swagger and OpenAPI as the source of truth when payload details matter.", zh: "当请求与响应细节重要时，把 Swagger 与 OpenAPI 作为唯一真相来源。" },
  },
];

export default async function QuickstartPage() {
  const apiDocsLinks = getApiDocsLinks();
  const locale = await getLocale();
  const apiBase = getApiBaseUrl() || "http://127.0.0.1:8000";
  const steps = buildSteps(apiBase);

  return (
    <NavShell
      eyebrow={tr(locale, "Quickstart", "快速开始")}
      title={tr(locale, "Teach a new agent the exact control-plane happy path.", "把控制平面的标准路径教给新 Agent。")}
      subtitle={tr(locale, "Use this page for the call order. Start with HTTP when you want direct API control, or jump to MCP when the agent should discover tools dynamically.", "用此页确认调用顺序。需要直接控制就走 HTTP；需要动态发现工具就走 MCP。")}
      activeHref="/quickstart"
      headerActions={
        <div className="subtle-actions">
          <Link className="button-link" href="/agent">
            {tr(locale, "Open agent self-serve", "打开 Agent 自助台")}
          </Link>
          <a className="button-link secondary" href="#mcp-quickstart">
            {tr(locale, "Jump to MCP", "跳到 MCP")}
          </a>
        </div>
      }
    >
      <section className="dashboard-stage">
        <article className="panel feature-panel stack">
          <div>
            <div className="kicker">{tr(locale, "Before you start", "开始之前")}</div>
            <h2>{tr(locale, "Keep one human-readable guide and one machine-readable contract side by side.", "把一份给人看的指南和一份给机器读的契约放在一起。")}</h2>
            <p className="muted section-intro">
              {tr(
                locale,
                "Use this page for the call order. Human operators exchange the bootstrap management credential at `/api/session/login`, then use the short-lived session cookie for management work. Runtime routes stay on per-agent bearer keys.",
                "用这页确认调用顺序。人类运营者先在 `/api/session/login` 交换 bootstrap 管理凭据，再用短期 session cookie 做管理操作；运行时路由则始终使用每个 Agent 独立的 bearer key。",
              )}
            </p>
          </div>
          <div className="signal-list signal-list-inline">
            {requirements.map((item) => (
              <div key={item.title.en} className="signal-item">
                <span>{tr(locale, item.title.en, item.title.zh)}</span>
                <strong>{tr(locale, item.note.en, item.note.zh)}</strong>
              </div>
            ))}
          </div>
        </article>
        <aside className="panel dashboard-guide stack">
          <div>
            <div className="kicker">{tr(locale, "Docs and tools", "文档与工具")}</div>
            <h2>{tr(locale, "Keep the next action close.", "把下一步动作放在手边。")}</h2>
          </div>
          <div className="subtle-actions action-stack">
            <Link className="button-link secondary" href="/agents">
              {tr(locale, "Create or inspect agents", "创建或查看 Agents")}
            </Link>
            {apiDocsLinks ? (
              <>
                <a className="button-link secondary" href={apiDocsLinks.swaggerUrl} target="_blank" rel="noreferrer">
                  {docsLabel(locale, "swagger")}
                </a>
                <a className="button-link secondary" href={apiDocsLinks.openapiUrl} target="_blank" rel="noreferrer">
                  {docsLabel(locale, "openapi")}
                </a>
              </>
            ) : (
              <div className="empty-state">
                {tr(locale, "Configure `AGENT_CONTROL_PLANE_API_URL` to show live API docs links.", "配置 `AGENT_CONTROL_PLANE_API_URL` 后显示实时 API 文档链接。")}
              </div>
            )}
          </div>
        </aside>
      </section>
      <section className="panel stack section-space">
        <div className="stack stack-tight">
          <div className="kicker">{tr(locale, "HTTP flow", "HTTP 路径")}</div>
          <h2>{tr(locale, "Walk the six-step happy path in order.", "按顺序走完这六步标准路径。")}</h2>
          <p className="muted section-intro">
            {tr(locale, "Keep the task claimed before you invoke, request a lease only when proxy mode is not enough, and complete the task as the final step.", "先认领任务再调用能力，只有代理模式不够时才申请租约，最后一步再完成任务。")}
          </p>
        </div>
        <ol className="step-list">
          {steps.map((step, index) => (
            <li key={step.title.en} className="step-card">
              <div className="step-index">{index + 1}</div>
              <div className="step-content">
                <div className="stack stack-tight">
                  <div className="kicker">{tr(locale, "Happy path", "标准路径")}</div>
                  <h3>{tr(locale, step.title.en, step.title.zh)}</h3>
                </div>
                <pre className="code-block">
                  <code>{step.code}</code>
                </pre>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="dashboard-grid section-space">
        <article id="mcp-quickstart" className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "MCP quickstart", "MCP 快速开始")}</div>
            <h2>{tr(locale, "Expose the same runtime flow through MCP tools.", "通过 MCP 工具暴露同一套运行时流程。")}</h2>
            <p className="muted">
              {tr(
                locale,
                "The MCP endpoint reuses the same agent bearer key and preserves runtime semantics such as `403 policy_denied` and `409 approval_required`.",
                "MCP 端点复用同一个 agent bearer key，并保留 `403 policy_denied` 与 `409 approval_required` 这类运行时语义。",
              )}
            </p>
          </div>
          <pre className="code-block">
            <code>{`curl -sS \\
  -H "Authorization: Bearer $ACP_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_tasks","arguments":{}}}' \\
  "${apiBase}/mcp"`}</code>
          </pre>
        </article>
        <article className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Failure codes", "常见失败码")}</div>
            <h2>{tr(locale, "What agents should infer from common failures", "Agent 应从常见失败中推断什么")}</h2>
          </div>
          <div className="list">
            <div className="list-item">
              <strong>401</strong>
              <span className="muted">{tr(locale, "Missing, unknown, or revoked bearer token.", "访问令牌缺失、未知或已吊销。")}</span>
            </div>
            <div className="list-item">
              <strong>403</strong>
              <span className="muted">{tr(locale, "Outside the allowlist, task contract, or lease policy boundary.", "超出允许清单、任务契约或租约策略边界。")}</span>
            </div>
            <div className="list-item">
              <strong>409</strong>
              <span className="muted">{tr(locale, "The task is already claimed or no longer claimable.", "任务已被认领或不再可认领。")}</span>
            </div>
          </div>
        </article>
      </section>
    </NavShell>
  );
}
