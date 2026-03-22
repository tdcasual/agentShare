import { createTaskAction } from "../actions";
import { NavShell } from "../../components/nav-shell";
import { TaskForm } from "../../components/task-form";
import { TasksTable } from "../../components/tasks-table";
import { getCollectionNotice, getPlaybooks, getTasks } from "../../lib/api";
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
  const canManageTasks = await hasManagementSession();
  const tasksResult = await getTasks();
  const tasks = tasksResult.items;
  const tasksNotice = getCollectionNotice(tasksResult, "tasks");
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
      eyebrow="Tasks"
      title="Queue lightweight work that any eligible agent can pick up."
      subtitle="Small, claimable units of work with clear policy guardrails."
      activeHref="/tasks"
    >
      {created ? (
        <section className="notice success" role="status">
          Task published: <strong>{created}</strong>
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "invalid-input"
            ? "Task input must be valid JSON."
            : error === "invalid-policy"
              ? "Task policy rules must be a valid JSON array."
            : error === "missing-fields"
              ? "Title and task type are required."
              : error === "invalid-playbooks"
                ? "Every referenced playbook must already exist before the task can be published."
              : error === "management-auth"
                ? "The management session is missing or expired."
                : error === "api-disconnected"
                  ? "The API base URL is not configured, so the console cannot publish tasks."
              : "The task could not be created."}
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
      <div className="workspace-grid">
        <div className="workspace-main">
          {canManageTasks ? (
            <TaskForm action={createTaskAction} />
          ) : (
            <section className="panel stack">
              <div>
                <div className="kicker">Management login required</div>
                <h2>Sign in to publish new tasks</h2>
                <p className="muted">
                  Task listing stays visible, but task creation now requires a human management session.
                </p>
              </div>
              <a className="button-link" href="/login?next=%2Ftasks">
                Log in to manage tasks
              </a>
            </section>
          )}
        </div>
        <div className="workspace-side">
          <TasksTable tasks={tasks} playbookLinks={playbookLinks} />
        </div>
      </div>
    </NavShell>
  );
}
