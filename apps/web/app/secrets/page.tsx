import { createSecretAction } from "../actions";
import { SecretsForm } from "../../components/secrets-form";
import { NavShell } from "../../components/nav-shell";
import { getSecrets } from "../../lib/api";

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
  const params = (await searchParams) ?? {};
  const secrets = await getSecrets();
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Secrets"
      title="Put raw credentials behind references, policy, and audit."
      subtitle="The app layer should know names, scopes, and bindings. The secret backend should hold the sensitive plaintext."
    >
      {created ? (
        <section className="notice success" role="status">
          Secret saved: <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-scope"
            ? "Scope must be valid JSON."
            : error === "missing-fields"
              ? "Display name and secret value are required."
              : "The secret could not be saved."}
        </section>
      ) : null}
      <div className="grid">
        <SecretsForm action={createSecretAction} />
        <section className="panel stack">
          <div>
            <div className="kicker">Inventory</div>
            <h2>Current secret references</h2>
          </div>
          {secrets.length > 0 ? (
            <ul className="list">
              {secrets.map((secret) => (
                <li key={secret.id} className="list-item">
                  <strong>{secret.display_name}</strong>
                  <span className="muted">
                    {secret.kind} · {secret.backend_ref}
                  </span>
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
    </NavShell>
  );
}
