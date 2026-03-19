export function SecretsForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <section className="panel stack" aria-labelledby="secret-form-title">
      <div>
        <div className="kicker">New secret</div>
        <h2 id="secret-form-title">Create a secret without exposing it in chat</h2>
        <p className="muted">
          The MVP stores only metadata in the app layer. Secrets should be written to the backend
          vault and consumed through capabilities.
        </p>
      </div>
      <form className="form" action={action}>
        <div className="form-row">
          <label>
            Display name
            <input name="display_name" placeholder="OpenAI production key" required />
          </label>
          <label>
            Kind
            <select name="kind" defaultValue="api_token">
              <option value="api_token">API token</option>
              <option value="cookie">Cookie</option>
              <option value="refresh_token">Refresh token</option>
            </select>
          </label>
        </div>
        <label>
          Secret value
          <input name="value" type="password" placeholder="Paste the secret here" required />
        </label>
        <div className="form-row">
          <label>
            Provider
            <input name="provider" placeholder="openai" required />
          </label>
          <label>
            Environment
            <input name="environment" placeholder="production" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Provider scopes
            <input name="provider_scopes" placeholder="responses.read,responses.write" />
          </label>
          <label>
            Resource selector
            <input name="resource_selector" placeholder="org:core" />
          </label>
        </div>
        <label>
          Metadata (JSON)
          <textarea name="metadata" defaultValue='{"owner":"platform"}' />
        </label>
        <button type="submit">Save secret</button>
      </form>
    </section>
  );
}
