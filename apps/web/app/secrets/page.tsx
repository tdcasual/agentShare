import { createSecretAction } from "../actions";
import { ManagementRolePanel } from "../../components/management-role-panel";
import { SecretsForm } from "../../components/secrets-form";
import { NavShell } from "../../components/nav-shell";
import { getCollectionNotice, getIntakeCatalog, getSecrets } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { hasManagementRole, requireManagementSession } from "../../lib/management-session";

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

export default async function SecretsPage({ searchParams }: PageProps) {
  const session = await requireManagementSession("/secrets");
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const canManageSecrets = hasManagementRole(session.role, "admin");
  const [secretsResult, intakeCatalogResult] = await Promise.all([
    canManageSecrets
      ? getSecrets()
      : Promise.resolve({
        items: [],
        source: "error" as const,
        error: "403 admin role required",
      }),
    canManageSecrets
      ? getIntakeCatalog()
      : Promise.resolve({
        item: null,
        source: "error" as const,
        error: "403 admin role required",
      }),
  ]);
  const secrets = secretsResult.items;
  const secretsNotice = getCollectionNotice(secretsResult, tr(locale, "secrets", "密钥"), locale);
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow={tr(locale, "Secrets", "密钥")}
      title={tr(locale, "Put raw credentials behind references, policy, and audit.", "用引用、策略与审计把原始凭据保护起来。")}
      subtitle={tr(locale, "The app layer should know names, scopes, and bindings. The secret backend should hold the sensitive plaintext.", "应用层只需知道名称、范围与绑定关系；敏感明文应存放在后端密钥仓库。")}
      activeHref="/secrets"
    >
      {created ? (
        <section className="notice success" role="status">
          {tr(locale, "Secret saved:", "密钥已保存：")} <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-metadata"
            ? tr(locale, "Metadata must be valid JSON.", "元数据必须是合法 JSON。")
            : error === "missing-fields"
              ? tr(locale, "Display name, provider, and secret value are required.", "显示名称、服务提供方与密钥内容为必填。")
              : error === "management-auth"
                ? tr(locale, "The management session is missing or expired.", "管理会话缺失或已过期。")
                : error === "insufficient-role"
                  ? tr(locale, "Your current role cannot manage secrets.", "当前角色无权管理密钥。")
                : error === "api-disconnected"
                  ? tr(locale, "The API base URL is not configured, so the console cannot save secrets.", "未配置 API Base URL，控制台无法保存密钥。")
              : tr(locale, "The secret could not be saved.", "密钥保存失败。")}
        </section>
      ) : null}
      <section
        className={
          secretsNotice.tone === "success"
            ? "notice success"
            : secretsNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={secretsNotice.tone === "error" ? "alert" : "status"}
      >
        {secretsNotice.message}
      </section>
      <div className="workspace-grid workspace-grid-priority">
        <div className="workspace-main">
          {canManageSecrets ? (
            <SecretsForm
              action={createSecretAction}
              catalog={intakeCatalogResult.item}
              locale={locale}
            />
          ) : (
            <ManagementRolePanel
              locale={locale}
              currentRole={session.role}
              requiredRole="admin"
              title={tr(locale, "An admin role is required to manage secret inventory.", "需要管理员角色才能管理密钥清单。")}
              description={tr(
                locale,
                "Secret creation and inventory stay hidden until the current management session can handle sensitive credential references.",
                "只有当前管理会话具备处理敏感凭据引用的权限时，才会显示密钥创建表单和密钥清单。",
              )}
            />
          )}
        </div>
        <div className="workspace-side">
          <section className="panel compact-panel stack">
            <div className="stack stack-tight">
              <div className="kicker">{tr(locale, "Vault posture", "密钥姿态")}</div>
              <h2>{tr(locale, "Register controlled references, not raw credentials in chat.", "在这里登记受控引用，而不是在聊天里粘贴原始凭据。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Define provider, environment, and scope once so later capability bindings stay narrow and legible.",
                  "先把服务提供方、环境和权限范围定义清楚，后续能力绑定才会足够收敛、足够清晰。",
                )}
              </p>
            </div>
            <div className="info-rail">
              <strong>
                {secrets.length === 0
                  ? tr(locale, "No secrets stored yet", "尚未存储密钥")
                  : tr(locale, `${secrets.length} references on file`, `已登记 ${secrets.length} 条引用`)}
              </strong>
              <p className="muted">
                {tr(locale, "The backend holds the sensitive value. The console only needs the contract around it.", "后端保存敏感明文，控制台只需要它的契约信息。")}
              </p>
            </div>
          </section>
          <section className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Operator guidance", "运营建议")}</div>
              <h2>{tr(locale, "Keep each secret narrow and legible", "让每条密钥记录足够窄、足够可读")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "Prefer one provider and one environment per record. If a token has broad scope, make that obvious in the display name before you bind it into capabilities.",
                  "建议每条记录只对应一个服务提供方与一个环境。如果访问范围很大，在绑定能力前先在显示名称里明确标注。",
                )}
              </p>
            </div>
          </section>
          <section className="panel stack">
            <div>
              <div className="kicker">{tr(locale, "Inventory", "清单")}</div>
              <h2>{tr(locale, "Current secret references", "当前密钥引用")}</h2>
            </div>
            {canManageSecrets ? (
              secrets.length > 0 ? (
                <ul className="list inventory-list">
                  {secrets.map((secret) => (
                    <li key={secret.id} className="list-item">
                      <div className="inventory-meta">
                        <strong>{secret.display_name}</strong>
                        <span className="muted">
                          {secret.kind} · {secret.provider}
                        </span>
                        <code>{secret.backend_ref}</code>
                      </div>
                      <div className="chip-row">
                        {secret.environment ? <span className="chip">{secret.environment}</span> : null}
                        {secret.provider_scopes.map((scope) => (
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
                    "Nothing stored yet. The first secret you add here becomes a capability anchor for the rest of the platform.",
                    "当前未存储任何密钥。你在这里添加的第一条密钥，会成为后续能力绑定的锚点。",
                  )}
                </div>
              )
            ) : (
              <div className="empty-state">
                {tr(
                  locale,
                  "Secret inventory stays hidden until an admin or owner session is active.",
                  "只有管理员或所有者会话激活后，才会显示密钥清单。",
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </NavShell>
  );
}
