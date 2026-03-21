import { createSecretAction } from "../actions";
import { SecretsForm } from "../../components/secrets-form";
import { NavShell } from "../../components/nav-shell";
import { getCollectionNotice, getSecrets } from "../../lib/api";
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

export default async function SecretsPage({ searchParams }: PageProps) {
  await requireManagementSession("/secrets");
  const params = (await searchParams) ?? {};
  const secretsResult = await getSecrets();
  const secrets = secretsResult.items;
  const secretsNotice = getCollectionNotice(secretsResult, "secrets");
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Secrets"
      title="Put raw credentials behind references, policy, and audit."
      subtitle="The app layer should know names, scopes, and bindings. The secret backend should hold the sensitive plaintext."
      activeHref="/secrets"
    >
      {created ? (
        <section className="notice success" role="status">
          Secret saved: <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-metadata"
            ? "Metadata must be valid JSON."
            : error === "missing-fields"
              ? "Display name, provider, and secret value are required."
              : error === "management-auth"
                ? "The management session is missing or expired."
                : error === "api-disconnected"
                  ? "The API base URL is not configured, so the console cannot save secrets."
              : "The secret could not be saved."}
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
      <div className="workspace-grid">
        <div className="workspace-main">
          <section className="panel feature-panel stack">
            <div className="section-intro-grid">
              <div>
                <div className="kicker">Vault posture</div>
                <h2>Store the credential once, then bind everything else to metadata and policy.</h2>
                <p className="muted section-intro">
                  This page should feel more like registering a controlled asset than pasting a
                  token into a dashboard. Operators define provider, scope, and environment here so
                  later capability bindings stay narrow.
                </p>
              </div>
              <div className="aside-note">
                <strong>{secrets.length === 0 ? "No secrets stored yet" : `${secrets.length} references on file`}</strong>
                <span className="muted">
                  The backend keeps the sensitive value. The console only needs the contract around
                  it.
                </span>
              </div>
            </div>
          </section>
          <SecretsForm action={createSecretAction} />
        </div>
        <div className="workspace-side">
          <section className="panel stack">
            <div>
              <div className="kicker">Operator guidance</div>
              <h2>Keep each secret narrow and legible</h2>
              <p className="muted">
                Prefer one provider and one environment per record. If a token has broad scope,
                make that obvious in the display name before you bind it into capabilities.
              </p>
            </div>
          </section>
          <section className="panel stack">
          <div>
            <div className="kicker">Inventory</div>
            <h2>Current secret references</h2>
          </div>
          {secrets.length > 0 ? (
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
              Nothing stored yet. The first secret you add here becomes a capability anchor for the
              rest of the platform.
            </div>
          )}
          </section>
        </div>
      </div>
    </NavShell>
  );
}
