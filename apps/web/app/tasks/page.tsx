import { createTaskAction } from "../actions";
import { NavShell } from "../../components/nav-shell";
import { TaskForm } from "../../components/task-form";
import { TasksTable } from "../../components/tasks-table";
import { getTasks } from "../../lib/api";

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
  const tasks = await getTasks();
  const created = readSingleParam(params, "created");
  const error = readSingleParam(params, "error");

  return (
    <NavShell
      eyebrow="Tasks"
      title="Queue lightweight work that any eligible agent can pick up."
      subtitle="Tasks stay small on purpose. They carry input, required capabilities, lease policy, and execution status without turning into a heavy workflow engine."
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
            : error === "missing-fields"
              ? "Title and task type are required."
              : "The task could not be created."}
        </section>
      ) : null}
      <div className="grid">
        <TaskForm action={createTaskAction} />
        <TasksTable tasks={tasks} />
      </div>
    </NavShell>
  );
}
