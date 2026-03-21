export function TaskForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <section className="panel stack">
      <div>
        <div className="kicker">New task</div>
        <h2>Publish a task</h2>
        <p className="muted">
          Keep tasks compact and policy-aware. The control plane should hold the capability
          contract, while the task carries only the work context.
        </p>
      </div>
      <form className="form" action={action}>
        <label>
          Title
          <input name="title" placeholder="Sync QQ provider config" required />
        </label>
        <div className="form-row">
          <label>
            Task type
            <input name="task_type" placeholder="config_sync" required />
          </label>
          <label>
            Lease policy
            <select name="lease_allowed" defaultValue="false">
              <option value="false">Proxy only</option>
              <option value="true">Lease allowed</option>
            </select>
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
            placeholder='[{"decision":"manual","reason":"Production prompt runs require review","action_types":["invoke"],"task_types":["prompt_run"],"environments":["production"]}]'
          />
        </label>
        <label>
          Input
          <textarea name="input" defaultValue={'{"provider":"qq"}'} />
        </label>
        <label>
          Referenced playbooks
          <input
            name="playbook_ids"
            placeholder="playbook-1,playbook-2"
          />
        </label>
        <button type="submit">Create task</button>
      </form>
    </section>
  );
}
