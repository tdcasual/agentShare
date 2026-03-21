type SecretOption = {
  id: string;
  display_name: string;
  kind: string;
};

export function CapabilityForm({
  action,
  secrets,
}: {
  action: (formData: FormData) => void | Promise<void>;
  secrets: SecretOption[];
}) {
  return (
    <section className="panel stack" aria-labelledby="capability-form-title">
      <div>
        <div className="kicker">Capability studio</div>
        <h2 id="capability-form-title">Bind a stored secret into an ability agents can safely use</h2>
        <p className="muted">
          Capabilities are the trust envelope around a secret. Name the action clearly, attach one
          secret, and decide whether agents must stay in proxy mode or may request short leases.
        </p>
      </div>
      {secrets.length > 0 ? (
        <form className="form" action={action}>
          <label>
            Capability name
            <input name="name" placeholder="github.repo.sync" required />
          </label>
          <div className="form-row">
            <label>
              Bound secret
              <select name="secret_id" defaultValue={secrets[0]?.id} required>
                {secrets.map((secret) => (
                  <option key={secret.id} value={secret.id}>
                    {secret.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Allowed mode
              <select name="allowed_mode" defaultValue="proxy_only">
                <option value="proxy_only">Proxy only</option>
                <option value="proxy_or_lease">Proxy or lease</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Risk level
              <select name="risk_level" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Lease TTL
              <input name="lease_ttl_seconds" type="number" min="1" defaultValue="60" required />
            </label>
          </div>
          <div className="form-row">
            <label>
              Adapter type
              <select name="adapter_type" defaultValue="generic_http">
                <option value="generic_http">generic_http</option>
                <option value="openai">openai</option>
                <option value="github">github</option>
              </select>
            </label>
            <label>
              Adapter config JSON
              <textarea
                name="adapter_config"
                defaultValue="{}"
                placeholder='{"method":"GET","path":"/repos/{owner}/{repo}/issues"}'
              />
            </label>
          </div>
          <label>
            Approval mode
            <select name="approval_mode" defaultValue="auto">
              <option value="auto">Auto</option>
              <option value="manual">Manual review</option>
            </select>
          </label>
          <label>
            Policy rules JSON
            <textarea
              name="approval_rules"
              defaultValue="[]"
              placeholder='[{"decision":"manual","reason":"High-risk production invokes require review","action_types":["invoke"],"risk_levels":["high"],"providers":["openai"],"environments":["production"]}]'
            />
          </label>
          <div className="form-row">
            <label>
              Required provider
              <input name="required_provider" placeholder="github" required />
            </label>
            <label>
              Required provider scopes
              <input name="required_provider_scopes" placeholder="repo:read,repo:write" />
            </label>
          </div>
          <label>
            Allowed environments
            <input name="allowed_environments" placeholder="production,staging" />
          </label>
          <p className="muted">
            Use <code>generic_http</code> for arbitrary JSON APIs, <code>openai</code> for chat
            completions, and <code>github</code> for repository-scoped REST calls with templated
            paths.
          </p>
          <button type="submit">Create capability</button>
        </form>
      ) : (
        <div className="empty-state">
          Create a secret first. A capability is always anchored to one stored credential.
        </div>
      )}
    </section>
  );
}
