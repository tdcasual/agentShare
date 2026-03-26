import { createTaskAction } from "../actions";
import { NavShell } from "../../components/nav-shell";
import { TaskForm } from "../../components/task-form";
import { TasksTable } from "../../components/tasks-table";
import { getCollectionNotice, getPlaybooks, getTasks } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { hasManagementSession } from "../../lib/management-session";

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

export default async function TasksPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const canManageTasks = await hasManagementSession();
  const tasksResult = await getTasks();
  const tasks = tasksResult.items;
  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const claimedCount = tasks.filter((task) => task.status === "claimed").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const tasksNotice = getCollectionNotice(tasksResult, tr(locale, "tasks", "任务"), locale);
  const playbooksResult = canManageTasks ? await getPlaybooks() : null;
  const playbookLinks = new Map(
    (playbooksResult?.items ?? []).map((playbook) => [
      playbook.id,
      { title: playbook.title },
    ]),
  );
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow={tr(locale, "Tasks", "任务")}
      title={tr(locale, "Queue lightweight work that any eligible agent can pick up.", "把轻量任务放入队列，供符合条件的 Agent 认领。")}
      subtitle={tr(locale, "Small, claimable units of work with clear policy guardrails.", "小而可认领的工作单元，配合清晰的策略护栏。")}
      activeHref="/tasks"
    >
      {created ? (
        <section className="notice success" role="status">
          {tr(locale, "Task published:", "任务已发布：")} <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-input"
            ? tr(locale, "Task input must be valid JSON.", "任务输入必须是合法 JSON。")
            : error === "invalid-policy"
              ? tr(locale, "Task policy rules must be a valid JSON array.", "任务策略规则必须是合法的 JSON 数组。")
            : error === "missing-fields"
              ? tr(locale, "Title and task type are required.", "标题与任务类型为必填。")
            : error === "invalid-playbooks"
                ? tr(locale, "Every referenced playbook must already exist before the task can be published.", "引用的手册必须先存在，任务才能发布。")
              : error === "management-auth"
                ? tr(locale, "The management session is missing or expired.", "管理会话缺失或已过期。")
                : error === "api-disconnected"
                  ? tr(locale, "The API base URL is not configured, so the console cannot publish tasks.", "未配置 API Base URL，控制台无法发布任务。")
              : tr(locale, "The task could not be created.", "任务创建失败。")}
        </section>
      ) : null}
      <section
        className={
          tasksNotice.tone === "success"
            ? "notice success"
            : tasksNotice.tone === "error"
              ? "notice error"
              : "notice"
        }
        role={tasksNotice.tone === "error" ? "alert" : "status"}
      >
        {tasksNotice.message}
      </section>
      <div className="workspace-grid workspace-grid-priority">
        <div className="workspace-main">
          {canManageTasks ? (
            <TaskForm action={createTaskAction} locale={locale} />
          ) : (
            <section className="panel stack">
              <div>
                <div className="kicker">{tr(locale, "Management login required", "需要管理登录")}</div>
                <h2>{tr(locale, "Sign in to publish new tasks", "登录后发布新任务")}</h2>
                <p className="muted">
                  {tr(locale, "Task listing stays visible, but task creation now requires a human management session.", "任务列表仍可见，但发布任务需要人类管理会话。")}
                </p>
              </div>
              <a className="button-link" href="/login?next=%2Ftasks">
                {tr(locale, "Log in to manage tasks", "登录后管理任务")}
              </a>
            </section>
          )}
        </div>
        <div className="workspace-side">
          <section className="panel compact-panel stack">
            <div className="stack stack-tight">
              <div className="kicker">{tr(locale, "Queue snapshot", "队列快照")}</div>
              <h2>{tr(locale, "Keep each task narrow enough to review in one scan.", "让每个任务都保持在一眼能判断的范围内。")}</h2>
              <p className="muted">
                {tr(
                  locale,
                  "A good task has a clear title, one bounded task type, and only the approvals or playbooks it really needs.",
                  "高质量任务应该有明确标题、一个收敛的任务类型，以及真正需要的审批姿态和手册引用。",
                )}
              </p>
            </div>
            <div className="stat-inline-row">
              <div className="stat-inline">
                <span>{tr(locale, "Pending", "待认领")}</span>
                <strong>{pendingCount}</strong>
              </div>
              <div className="stat-inline">
                <span>{tr(locale, "Claimed", "进行中")}</span>
                <strong>{claimedCount}</strong>
              </div>
              <div className="stat-inline">
                <span>{tr(locale, "Completed", "已完成")}</span>
                <strong>{completedCount}</strong>
              </div>
            </div>
            <div className="info-rail">
              <strong>
                {canManageTasks
                  ? tr(locale, "Publishing is enabled", "当前可直接发布")
                  : tr(locale, "Queue is visible, publishing requires login", "当前可查看队列，发布需登录")}
              </strong>
              <p className="muted">
                {tr(
                  locale,
                  "Use management login only when you need to create or change work items.",
                  "只有在需要创建或修改任务时才需要管理登录。",
                )}
              </p>
            </div>
          </section>
          <TasksTable tasks={tasks} playbookLinks={playbookLinks} locale={locale} />
        </div>
      </div>
    </NavShell>
  );
}
