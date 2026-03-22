import Link from "next/link";

import { NavShell } from "../../components/nav-shell";
import { getApiDocsLinks } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";

const apiBase = "http://127.0.0.1:8000";

const steps = [
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

export default async function QuickstartPage() {
  const apiDocsLinks = getApiDocsLinks();
  const locale = await getLocale();

  return (
    <NavShell
      eyebrow={tr(locale, "Quickstart", "快速开始")}
      title={tr(locale, "Teach a new agent the exact control-plane happy path.", "把控制平面的标准 Happy Path 教给新 Agent。")}
      subtitle={tr(locale, "Use this page for the call order. Start with HTTP when you want direct API control, or jump to MCP when the agent should discover tools dynamically.", "用此页确认调用顺序。需要直接控制就走 HTTP；需要动态发现工具就走 MCP。")}
      activeHref="/quickstart"
    >
      <section className="panel stack">
        <div>
          <div className="kicker">{tr(locale, "Self-serve route", "自助路径")}</div>
          <h2>{tr(locale, "One guide for humans, two machine-readable links for agents", "一份给人看的指南，两份给 Agent 的机器可读入口")}</h2>
          <p className="muted">
            {tr(
              locale,
              "Runtime routes use per-agent bearer API keys. Human operators now exchange the bootstrap management credential at `/api/session/login`, then use the short-lived session cookie for management reads and writes.",
              "运行时路由使用每个 Agent 的 bearer key。人类运营者先在 `/api/session/login` 交换 bootstrap 管理凭据，再用短期 session cookie 进行管理读写。",
            )}
          </p>
        </div>
        <div className="chip-row">
          <Link className="button-link" href="/agent">
            {tr(locale, "Open agent self-serve", "打开 Agent 自助台")}
          </Link>
          <Link className="button-link secondary" href="/agents">
            {tr(locale, "Create or inspect agents", "创建或查看 Agents")}
          </Link>
          <a className="button-link secondary" href="#mcp-quickstart">
            {tr(locale, "MCP quickstart", "MCP 快速开始")}
          </a>
          {apiDocsLinks ? (
            <>
              <a className="button-link" href={apiDocsLinks.swaggerUrl} target="_blank" rel="noreferrer">
                {tr(locale, "Swagger UI", "Swagger UI")}
              </a>
              <a className="button-link secondary" href={apiDocsLinks.openapiUrl} target="_blank" rel="noreferrer">
                {tr(locale, "OpenAPI JSON", "OpenAPI JSON")}
              </a>
            </>
          ) : (
            <span className="muted">
              {tr(locale, "Configure `AGENT_CONTROL_PLANE_API_URL` to show live API docs links.", "配置 `AGENT_CONTROL_PLANE_API_URL` 后显示实时 API 文档链接。")}
            </span>
          )}
        </div>
      </section>
      <section className="grid section-space">
        {steps.map((step) => (
          <article key={step.title.en} className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Happy path", "Happy Path")}</div>
              <h2>{tr(locale, step.title.en, step.title.zh)}</h2>
            </div>
            <pre className="code-block">
              <code>{step.code}</code>
            </pre>
          </article>
        ))}
      </section>
      <section id="mcp-quickstart" className="panel stack section-space">
        <div>
          <div className="kicker">{tr(locale, "MCP quickstart", "MCP 快速开始")}</div>
          <h2>{tr(locale, "Expose the same runtime flow through MCP tools", "通过 MCP 工具暴露同一套运行时流程")}</h2>
          <p className="muted">
            {tr(
              locale,
              "The MCP endpoint reuses the same agent bearer key and preserves runtime semantics such as `403 policy_denied` and `409 approval_required`.",
              "MCP 端点复用同一个 agent bearer key，并保留运行时语义，如 `403 policy_denied` 与 `409 approval_required`。",
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
      </section>
      <section className="panel stack section-space">
        <div>
          <div className="kicker">{tr(locale, "Failure codes", "常见失败码")}</div>
          <h2>{tr(locale, "What agents should infer from common failures", "Agent 应从常见失败中推断什么")}</h2>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>401</strong>
            <span className="muted">{tr(locale, "Missing, unknown, or revoked bearer token.", "bearer token 缺失、未知或已吊销。")}</span>
          </div>
          <div className="list-item">
            <strong>403</strong>
            <span className="muted">{tr(locale, "Outside the allowlist, task contract, or lease policy boundary.", "超出 allowlist、任务契约或租约策略边界。")}</span>
          </div>
          <div className="list-item">
            <strong>409</strong>
            <span className="muted">{tr(locale, "The task is already claimed or no longer claimable.", "任务已被认领或不再可认领。")}</span>
          </div>
        </div>
      </section>
    </NavShell>
  );
}
