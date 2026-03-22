import { createCapabilityAction } from "../actions";
import { CapabilityForm } from "../../components/capability-form";
import { NavShell } from "../../components/nav-shell";
import { getCapabilities, getCollectionNotice, getSecrets } from "../../lib/api";
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

export default async function CapabilitiesPage({ searchParams }: PageProps) {
  await requireManagementSession("/capabilities");
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const capabilitiesResult = await getCapabilities();
  const capabilities = capabilitiesResult.items;
  const capabilitiesNotice = getCollectionNotice(capabilitiesResult, tr(locale, "capabilities", "能力"), locale);
  const secretsResult = await getSecrets();
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
            ? tr(locale, "Choose a secret, add a name, required provider, and provide a valid lease TTL.", "请选择密钥并填写名称、required provider 和合法的租约 TTL。")
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
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel feature-panel stack">
            <div className="section-intro-grid">
              <div>
                <div className="kicker">Capability design</div>
                <h2>Shape one explicit runtime contract for each sensitive action.</h2>
                <p className="muted section-intro">
                  A capability is where secret binding, adapter choice, lease mode, and approval
                  posture come together. Keep it narrow enough that an operator can understand the
                  risk in one scan.
                </p>
              </div>
              <div className="aside-note">
                <strong>{capabilities.length === 0 ? "No bindings yet" : `${capabilities.length} capability contracts`}</strong>
                <span className="muted">
                  Prefer first-class adapters when possible so runtime responses stay predictable.
                </span>
              </div>
            </div>
          </section>
          <CapabilityForm action={createCapabilityAction} secrets={secrets} locale={locale} />
        </div>
        <div className="workspace-side">
          <section className="panel stack">
            <div>
              <div className="kicker">Adapter choice</div>
              <h2>Pick the narrowest adapter that matches the upstream system</h2>
              <p className="muted">
                Use GitHub for repository-scoped REST calls, OpenAI for chat completions, and
                generic HTTP only when no first-class adapter fits.
              </p>
            </div>
          </section>
          <section className="panel stack">
          <div>
            <div className="kicker">Bindings</div>
            <h2>Available capability contracts</h2>
          </div>
          {capabilities.length > 0 ? (
            <ul className="list inventory-list">
              {capabilities.map((capability) => (
                <li key={capability.id} className="list-item">
                  <div className="inventory-meta">
                    <strong>{capability.name}</strong>
                    <span className="muted">
                      Bound to {secretNames.get(capability.secret_id) ?? capability.secret_id}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{capability.allowed_mode}</span>
                    <span className="chip">{capability.risk_level} risk</span>
                    <span className="chip">{capability.adapter_type} adapter</span>
                    <span className="chip">
                      {capability.approval_mode === "manual" ? "manual approval" : "auto approval"}
                    </span>
                    <span className="chip">{capability.lease_ttl_seconds}s ttl</span>
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
              No capability has been defined yet. This page becomes the bridge between stored
              credentials and agent-visible actions.
            </div>
          )}
          </section>
        </div>
      </div>
    </NavShell>
  );
}
