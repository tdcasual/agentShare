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
        <label>
          Scope
          <textarea
            name="scope"
            defaultValue={'{"provider":"openai","environment":"production"}'}
          />
        </label>
        <button type="submit">Save secret</button>
      </form>
    </section>
  );
}
