import { createCapabilityAction } from "../actions";
import { CapabilityForm } from "../../components/capability-form";
import { NavShell } from "../../components/nav-shell";
import { getCapabilities, getCollectionNotice, getIntakeCatalog, getSecrets } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { requireManagementSession } from "../../lib/management-session";
import {
  adapterTypeLabel,
  approvalModeLabel,
  capabilityModeLabel,
  riskLevelLabel,
} from "../../lib/ui";

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

export default async function CapabilitiesPage({ searchParams }: PageProps) {
  await requireManagementSession("/capabilities");
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const [capabilitiesResult, secretsResult, intakeCatalogResult] = await Promise.all([
    getCapabilities(),
    getSecrets(),
    getIntakeCatalog(),
  ]);
  const capabilities = capabilitiesResult.items;
  const capabilitiesNotice = getCollectionNotice(capabilitiesResult, tr(locale, "capabilities", "能力"), locale);
  const secrets = secretsResult.items;
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");
  const secretNames = new Map(secrets.map((secret) => [secret.id, secret.display_name]));

  return (
    <NavShell
      eyebrow={tr(locale, "Capabilities", "能力")}
      title={tr(locale, "Make agents ask for approved abilities, not for raw tokens.", "让 Agent 请求可审核的能力，而不是原始 token。")}
      subtitle={tr(locale, "Capabilities sit between agents and secrets. They define adapter type, mode, risk, and whether a lease can ever be issued.", "能力位于 Agent 与密钥之间，定义适配器、模式、风险与是否允许发放租约。")}
      activeHref="/capabilities"
    >
      {created ? (
        <section className="notice success" role="status">
          {tr(locale, "Capability created:", "能力已创建：")} <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-fields"
            ? tr(locale, "Choose a secret, add a name, required provider, and provide a valid lease TTL.", "请选择密钥并填写名称、服务提供方以及合法的租约时长。")
              : error === "invalid-policy"
                ? tr(locale, "Capability policy rules must be a valid JSON array.", "能力策略规则必须是合法的 JSON 数组。")
              : error === "invalid-adapter-config"
                ? tr(locale, "Adapter config must be a valid JSON object.", "适配器配置必须是合法的 JSON 对象。")
              : error === "invalid-contract"
                ? tr(locale, "The selected secret does not satisfy the capability scope contract.", "所选密钥不满足能力范围契约。")
              : error === "management-auth"
                ? tr(locale, "The management session is missing or expired.", "管理会话缺失或已过期。")
                : error === "api-disconnected"
                  ? tr(locale, "The API base URL is not configured, so the console cannot save capabilities.", "未配置 API Base URL，控制台无法保存能力。")
            : tr(locale, "The capability could not be created.", "能力创建失败。")}
        </section>
      ) : null}
      <section
        className={
          capabilitiesNotice.tone === "success"
            ? "notice success"
            : capabilitiesNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={capabilitiesNotice.tone === "error" ? "alert" : "status"}
      >
        {capabilitiesNotice.message}
      </section>
      <div className="workspace-grid workspace-grid-priority">
        <div className="workspace-main">
          <CapabilityForm
            action={createCapabilityAction}
            catalog={intakeCatalogResult.item}
            secrets={secrets}
            locale={locale}
          />
        </div>
        <div className="workspace-side">
          <section className="panel compact-panel stack">
            <div className="stack stack-tight">
              <div className="kicker">{tr(locale, "Capability design", "能力设计")}</div>
              <h2>{tr(locale, "Define one explicit runtime contract for each sensitive action.", "为每个敏感动作定义一份明确契约。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "A capability should be narrow enough that an operator can understand secret binding, adapter choice, and review posture in one scan.",
                  "一条能力应当窄到让运营者一眼看懂密钥绑定、适配器选择和审批姿态。",
                )}
              </p>
            </div>
            <div className="info-rail">
              <strong>
                {capabilities.length === 0
                  ? tr(locale, "No bindings yet", "还没有绑定关系")
                  : tr(locale, `${capabilities.length} capability contracts`, `已定义 ${capabilities.length} 条能力契约`)}
              </strong>
              <p className="muted">
                {tr(locale, "Prefer first-class adapters whenever possible so runtime behavior stays predictable.", "尽量优先使用一等适配器，让运行时行为保持可预测。")}
              </p>
            </div>
          </section>
          <section className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Adapter choice", "适配器选择")}</div>
              <h2>{tr(locale, "Pick the narrowest adapter that matches the upstream system", "选择最贴合上游系统且最窄的适配器")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Use GitHub for repository-scoped REST calls, OpenAI for chat completions, and generic HTTP only when no first-class adapter fits.",
                  "仓库范围的 REST 调用优先用 GitHub 适配器，对话调用优先用 OpenAI 适配器，只有没有一等适配器时再使用 generic HTTP。",
                )}
              </p>
            </div>
          </section>
          <section className="panel stack">
          <div>
            <div className="kicker">{tr(locale, "Bindings", "绑定关系")}</div>
            <h2>{tr(locale, "Available capability contracts", "当前能力契约")}</h2>
          </div>
          {capabilities.length > 0 ? (
            <ul className="list inventory-list">
              {capabilities.map((capability) => (
                <li key={capability.id} className="list-item">
                  <div className="inventory-meta">
                    <strong>{capability.name}</strong>
                    <span className="muted">
                      {tr(locale, "Bound to ", "绑定到 ")}
                      {secretNames.get(capability.secret_id) ?? capability.secret_id}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{capabilityModeLabel(locale, capability.allowed_mode)}</span>
                    <span className="chip">{riskLevelLabel(locale, capability.risk_level)}</span>
                    <span className="chip">{adapterTypeLabel(locale, capability.adapter_type)}</span>
                    <span className="chip">{approvalModeLabel(locale, capability.approval_mode)}</span>
                    <span className="chip">{tr(locale, `${capability.lease_ttl_seconds}s ttl`, `${capability.lease_ttl_seconds} 秒 TTL`)}</span>
                    {capability.required_provider ? (
                      <span className="chip">{capability.required_provider}</span>
                    ) : null}
                    {capability.required_provider_scopes.map((scope) => (
                      <span key={scope} className="chip">{scope}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              {tr(
                locale,
                "No capability has been defined yet. This page becomes the bridge between stored credentials and agent-visible actions.",
                "当前还没有定义能力。这里会成为已存储凭据与 Agent 可见动作之间的桥梁。",
              )}
            </div>
          )}
          </section>
        </div>
      </div>
    </NavShell>
  );
}
