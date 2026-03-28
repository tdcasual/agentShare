import Link from "next/link";

import { AgentForm } from "../../components/agent-form";
import { ManagementRolePanel } from "../../components/management-role-panel";
import { NavShell } from "../../components/nav-shell";
import { AgentKeyDisplay } from "../../components/agent-key-display";
import { getAgents, getApiDocsLinks, getApiBaseUrl, getCollectionNotice, getIntakeCatalog } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { hasManagementRole, requireManagementSession } from "../../lib/management-session";
import { agentsCatalogLabel, docsLabel, riskLevelLabel } from "../../lib/ui";
import { createAgentAction } from "../actions";

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

export default async function AgentsPage({ searchParams }: PageProps) {
  const session = await requireManagementSession("/agents");
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const canManageAgents = hasManagementRole(session.role, "admin");
  const [agentsResult, intakeCatalogResult] = await Promise.all([
    canManageAgents
      ? getAgents()
      : Promise.resolve({
        items: [],
        source: "error" as const,
        error: "403 admin role required",
      }),
    canManageAgents
      ? getIntakeCatalog()
      : Promise.resolve({
        item: null,
        source: "error" as const,
        error: "403 admin role required",
      }),
  ]);
  const agents = agentsResult.items;
  const agentsNotice = getCollectionNotice(agentsResult, tr(locale, "agents", "Agent 列表"), locale);
  const apiBaseUrl = getApiBaseUrl();
  const apiDocsLinks = getApiDocsLinks();
  const apiKey = readSingleParam(params, "api_key");
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow={agentsCatalogLabel(locale)}
      title={tr(locale, "Track each agent as its own identity with its own trust boundary.", "将每个 Agent 视为独立身份与独立信任边界。")}
      subtitle={tr(locale, "Each agent authenticates independently and carries a bounded risk tier.", "每个 Agent 独立认证，并携带受限的风险等级。")}
      activeHref="/agents"
    >
      {apiKey && <AgentKeyDisplay apiKey={apiKey} apiBaseUrl={apiBaseUrl} locale={locale} />}

      {created && !apiKey && (
        <section className="notice success" role="status">
          {tr(locale, "Agent created:", "Agent 已创建：")} <strong>{created}</strong>
        </section>
      )}

      {error && (
        <section className="notice error" role="alert">
          {error === "management-auth"
            ? tr(locale, "The management session is missing or expired.", "管理会话缺失或已过期。")
            : error === "insufficient-role"
              ? tr(locale, "Your current role cannot manage agents.", "当前角色无权管理 Agent。")
            : error === "api-disconnected"
              ? tr(locale, "The API base URL is not configured for management calls.", "未配置管理调用的 API Base URL。")
              : tr(locale, "The agent could not be created.", "Agent 创建失败。")}
        </section>
      )}
      <section
        className={
          agentsNotice.tone === "success"
            ? "notice success"
            : agentsNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={agentsNotice.tone === "error" ? "alert" : "status"}
      >
        {agentsNotice.message}
      </section>

      <section className="panel stack section-card">
        <div>
          <div className="kicker">{tr(locale, "Onboarding links", "上手链接")}</div>
          <h2>{tr(locale, "Teach new agents with the quickstart and API schema", "用快速开始与 API Schema 帮助新 Agent 上手")}</h2>
          <p className="muted section-intro">
            {tr(
              locale,
              "Keep one operator-facing path for setup and one machine-readable path for runtime discovery so new agents can onboard without source diving.",
              "保留一条面向运营者的配置路径，以及一条机器可读的运行时发现路径，让新 Agent 不翻源码也能上手。",
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
            <span className="muted">
              {tr(locale, "Set `AGENT_CONTROL_PLANE_API_URL` to show live API docs links.", "设置 `AGENT_CONTROL_PLANE_API_URL` 后显示实时 API 文档链接。")}
            </span>
          )}
        </div>
      </section>

      {canManageAgents ? (
        <details className="compact-details">
          <summary>{tr(locale, "Register new agent", "注册新 Agent")}</summary>
          <AgentForm
            action={createAgentAction}
            catalog={intakeCatalogResult.item}
            locale={locale}
          />
        </details>
      ) : (
        <ManagementRolePanel
          locale={locale}
          currentRole={session.role}
          requiredRole="admin"
          title={tr(locale, "An admin role is required to manage agent inventory.", "需要管理员角色才能管理 Agent 清单。")}
          description={tr(
            locale,
            "Agent creation and inventory stay hidden until the current management session can manage operator-owned identities.",
            "只有当前管理会话具备管理运营者持有身份的权限时，才会显示 Agent 创建与清单。",
          )}
        />
      )}

      {canManageAgents ? (
        <section className="grid">
          {agents.map((agent) => (
            <article key={agent.id} className="card">
              <div className="kicker">{agent.id}</div>
              <h2>{agent.name}</h2>
              <p className="muted">
                {tr(locale, "Auth via", "认证方式")} {agent.auth_method}
                {tr(locale, ", operating in the ", "，风险等级")} {riskLevelLabel(locale, agent.risk_tier)}
                {tr(locale, " risk tier.", "。")}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </NavShell>
  );
}
