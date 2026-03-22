import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

type SecretOption = {
  id: string;
  display_name: string;
  kind: string;
};

export function CapabilityForm({
  action,
  secrets,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  secrets: SecretOption[];
  locale?: Locale;
}) {
  return (
    <section className="panel stack" aria-labelledby="capability-form-title">
      <div>
        <div className="kicker">{tr(locale, "Capability studio", "能力工作台")}</div>
        <h2 id="capability-form-title">
          {tr(locale, "Bind a secret into a single, reviewable ability.", "把密钥绑定成一个可审核的单一能力。")}
        </h2>
        <p className="muted">
          {tr(
            locale,
            "Keep the name and adapter contract narrow. Move policy and JSON into Advanced.",
            "把名称与适配器契约保持足够窄。把策略与 JSON 放到高级设置里。",
          )}
        </p>
      </div>
      {secrets.length > 0 ? (
        <form className="form" action={action}>
          <label>
            {tr(locale, "Capability name", "能力名称")}
            <input name="name" placeholder={tr(locale, "github.repo.sync", "github.repo.sync")} required />
          </label>
          <div className="form-row">
            <label>
              {tr(locale, "Bound secret", "绑定密钥")}
              <select name="secret_id" defaultValue={secrets[0]?.id} required>
                {secrets.map((secret) => (
                  <option key={secret.id} value={secret.id}>
                    {secret.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr(locale, "Allowed mode", "允许模式")}
              <select name="allowed_mode" defaultValue="proxy_only">
                <option value="proxy_only">{tr(locale, "Proxy only", "仅代理")}</option>
                <option value="proxy_or_lease">{tr(locale, "Proxy or lease", "代理或租约")}</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              {tr(locale, "Risk level", "风险等级")}
              <select name="risk_level" defaultValue="medium">
                <option value="low">{tr(locale, "Low", "低")}</option>
                <option value="medium">{tr(locale, "Medium", "中")}</option>
                <option value="high">{tr(locale, "High", "高")}</option>
              </select>
            </label>
            <label>
              {tr(locale, "Lease TTL", "租约 TTL")}
              <input name="lease_ttl_seconds" type="number" min="1" defaultValue="60" required />
            </label>
          </div>
          <div className="form-row">
            <label>
              {tr(locale, "Adapter type", "适配器类型")}
              <select name="adapter_type" defaultValue="generic_http">
                <option value="generic_http">generic_http</option>
                <option value="openai">openai</option>
                <option value="github">github</option>
              </select>
            </label>
            <label>
              {tr(locale, "Required provider", "Required provider")}
              <input name="required_provider" placeholder={tr(locale, "github", "github")} required />
            </label>
          </div>
          <label>
            {tr(locale, "Approval mode", "审批模式")}
            <select name="approval_mode" defaultValue="auto">
              <option value="auto">{tr(locale, "Auto", "自动")}</option>
              <option value="manual">{tr(locale, "Manual review", "人工复核")}</option>
            </select>
          </label>

          <details className="compact-details">
            <summary>{tr(locale, "Advanced settings", "高级设置")}</summary>
            <div className="stack">
              <label>
                {tr(locale, "Adapter config JSON", "适配器配置 JSON")}
                <textarea
                  name="adapter_config"
                  defaultValue="{}"
                  placeholder='{"method":"GET","path":"/repos/{owner}/{repo}/issues"}'
                />
              </label>
              <label>
                {tr(locale, "Policy rules JSON", "策略规则 JSON")}
                <textarea
                  name="approval_rules"
                  defaultValue="[]"
                  placeholder='[{"decision":"manual","reason":"High-risk production invokes require review","action_types":["invoke"],"risk_levels":["high"],"providers":["openai"],"environments":["production"]}]'
                />
              </label>
              <label>
                {tr(locale, "Required provider scopes", "Required provider scopes")}
                <input name="required_provider_scopes" placeholder={tr(locale, "repo:read,repo:write", "repo:read,repo:write")} />
              </label>
              <label>
                {tr(locale, "Allowed environments", "允许环境")}
                <input name="allowed_environments" placeholder={tr(locale, "production,staging", "production,staging")} />
              </label>
              <p className="muted">
                {tr(
                  locale,
                  "Choose the narrowest adapter that matches the upstream system. Keep JSON contracts small and legible.",
                  "选择最匹配上游系统且最窄的适配器。让 JSON 契约保持小且可读。",
                )}
              </p>
            </div>
          </details>
          <button type="submit">{tr(locale, "Create capability", "创建能力")}</button>
        </form>
      ) : (
        <div className="empty-state">
          {tr(locale, "Create a secret first. A capability is always anchored to one stored credential.", "请先创建密钥。能力必须锚定到一个已存储的凭据。")}
        </div>
      )}
    </section>
  );
}
