import { createCapabilityAction } from "../actions";
import { CapabilityForm } from "../../components/capability-form";
import { NavShell } from "../../components/nav-shell";
import { getCapabilities, getCollectionNotice, getSecrets } from "../../lib/api";

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
  const params = (await searchParams) ?? {};
  const capabilitiesResult = await getCapabilities();
  const capabilities = capabilitiesResult.items;
  const capabilitiesNotice = getCollectionNotice(capabilitiesResult, "capabilities");
  const secretsResult = await getSecrets();
  const secrets = secretsResult.items;
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");
  const secretNames = new Map(secrets.map((secret) => [secret.id, secret.display_name]));

  return (
    <NavShell
      eyebrow="Capabilities"
      title="Make agents ask for approved abilities, not for raw tokens."
      subtitle="Capabilities sit between agents and secrets. They define mode, risk, and whether a lease can ever be issued."
    >
      {created ? (
        <section className="notice success" role="status">
          Capability created: <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-fields"
            ? "Choose a secret, add a name, required provider, and provide a valid lease TTL."
            : error === "invalid-contract"
              ? "The selected secret does not satisfy the capability scope contract."
              : error === "management-auth"
                ? "The bootstrap management key is missing or was rejected."
                : error === "api-disconnected"
                  ? "The API base URL is not configured, so the console cannot save capabilities."
            : "The capability could not be created."}
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
      <div className="grid">
        <CapabilityForm action={createCapabilityAction} secrets={secrets} />
        <section className="panel stack">
          <div>
            <div className="kicker">Bindings</div>
            <h2>Available capability contracts</h2>
          </div>
          {capabilities.length > 0 ? (
            <ul className="list">
              {capabilities.map((capability) => (
                <li key={capability.id} className="list-item">
                  <strong>{capability.name}</strong>
                  <span className="muted">
                    Bound to {secretNames.get(capability.secret_id) ?? capability.secret_id}
                  </span>
                  <div className="chip-row">
                    <span className="chip">{capability.allowed_mode}</span>
                    <span className="chip">{capability.risk_level} risk</span>
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
    </NavShell>
  );
}
