import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

export function SecretsForm({
  action,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale?: Locale;
}) {
  return (
    <section className="panel stack" aria-labelledby="secret-form-title">
      <div>
        <div className="kicker">{tr(locale, "New secret", "新建密钥")}</div>
        <h2 id="secret-form-title">{tr(locale, "Create a secret without exposing it in chat", "创建密钥，不在聊天中暴露")}</h2>
        <p className="muted">
          {tr(
            locale,
            "The MVP stores only metadata in the app layer. Secrets should be written to the backend vault and consumed through capabilities.",
            "MVP 只在应用层保存元数据。密钥应写入后端仓库，并通过能力进行消费。",
          )}
        </p>
      </div>
      <form className="form" action={action}>
        <div className="form-row">
          <label>
            {tr(locale, "Display name", "显示名称")}
            <input name="display_name" placeholder={tr(locale, "OpenAI production key", "OpenAI 生产 key")} required />
          </label>
          <label>
            {tr(locale, "Kind", "类型")}
            <select name="kind" defaultValue="api_token">
              <option value="api_token">{tr(locale, "API token", "API token")}</option>
              <option value="cookie">{tr(locale, "Cookie", "Cookie")}</option>
              <option value="refresh_token">{tr(locale, "Refresh token", "刷新 token")}</option>
            </select>
          </label>
        </div>
        <label>
          {tr(locale, "Secret value", "密钥内容")}
          <input name="value" type="password" placeholder={tr(locale, "Paste the secret here", "在这里粘贴密钥")} required />
        </label>
        <div className="form-row">
          <label>
            {tr(locale, "Provider", "Provider")}
            <input name="provider" placeholder={tr(locale, "openai", "openai")} required />
          </label>
          <label>
            {tr(locale, "Environment", "环境")}
            <input name="environment" placeholder={tr(locale, "production", "production")} />
          </label>
        </div>
        <div className="form-row">
          <label>
            {tr(locale, "Provider scopes", "权限范围")}
            <input name="provider_scopes" placeholder={tr(locale, "responses.read,responses.write", "responses.read,responses.write")} />
          </label>
          <label>
            {tr(locale, "Resource selector", "资源选择器")}
            <input name="resource_selector" placeholder={tr(locale, "org:core", "org:core")} />
          </label>
        </div>
        <label>
          {tr(locale, "Metadata (JSON)", "元数据（JSON）")}
          <textarea name="metadata" defaultValue='{"owner":"platform"}' />
        </label>
        <button type="submit">{tr(locale, "Save secret", "保存密钥")}</button>
      </form>
    </section>
  );
}
