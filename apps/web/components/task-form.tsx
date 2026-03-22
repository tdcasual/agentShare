import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

export function TaskForm({
  action,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale?: Locale;
}) {
  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "New task", "新建任务")}</div>
        <h2>{tr(locale, "Publish a task", "发布任务")}</h2>
        <p className="muted">
          {tr(
            locale,
            "Title and input should be enough to understand the work. Keep policy and references in Advanced unless they matter right now.",
            "标题与输入应足以让人理解工作内容。除非现在必须，否则把策略与引用放到高级设置里。",
          )}
        </p>
      </div>
      <form className="form" action={action}>
        <label>
          {tr(locale, "Title", "标题")}
          <input name="title" placeholder={tr(locale, "Sync QQ provider config", "同步 QQ provider 配置")} required />
        </label>
        <div className="form-row">
          <label>
            {tr(locale, "Task type", "任务类型")}
            <input name="task_type" placeholder={tr(locale, "config_sync", "config_sync")} required />
          </label>
          <label>
            {tr(locale, "Lease policy", "租约策略")}
            <select name="lease_allowed" defaultValue="false">
              <option value="false">{tr(locale, "Proxy only", "仅代理")}</option>
              <option value="true">{tr(locale, "Lease allowed", "允许租约")}</option>
            </select>
          </label>
        </div>
        <label>
          {tr(locale, "Approval mode", "审批模式")}
          <select name="approval_mode" defaultValue="auto">
            <option value="auto">{tr(locale, "Auto", "自动")}</option>
            <option value="manual">{tr(locale, "Manual review", "人工复核")}</option>
          </select>
        </label>
        <label>
          {tr(locale, "Input", "输入")}
          <textarea name="input" defaultValue={'{"provider":"qq"}'} />
        </label>
        <details className="compact-details">
          <summary>{tr(locale, "Advanced settings", "高级设置")}</summary>
          <div className="stack">
            <label>
              {tr(locale, "Policy rules JSON", "策略规则 JSON")}
              <textarea
                name="approval_rules"
                defaultValue="[]"
                placeholder='[{"decision":"manual","reason":"Production prompt runs require review","action_types":["invoke"],"task_types":["prompt_run"],"environments":["production"]}]'
              />
            </label>
            <label>
              {tr(locale, "Referenced playbooks", "关联手册")}
              <input name="playbook_ids" placeholder={tr(locale, "playbook-1,playbook-2", "playbook-1,playbook-2")} />
            </label>
          </div>
        </details>
        <button type="submit">{tr(locale, "Create task", "创建任务")}</button>
      </form>
    </section>
  );
}
