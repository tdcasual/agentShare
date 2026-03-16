import { createCapabilityAction } from "../actions";
import { CapabilityForm } from "../../components/capability-form";
import { NavShell } from "../../components/nav-shell";
import { getCapabilities, getSecrets } from "../../lib/api";

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
  const capabilities = await getCapabilities();
  const secrets = await getSecrets();
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
            ? "Choose a secret, add a name, and provide a valid lease TTL."
            : "The capability could not be created."}
        </section>
      ) : null}
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
