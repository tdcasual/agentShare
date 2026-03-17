type Secret = {
  id: string;
  display_name: string;
  kind: string;
  backend_ref: string;
};

type Capability = {
  id: string;
  name: string;
  secret_id: string;
  allowed_mode: string;
  risk_level: string;
  lease_ttl_seconds: number;
};

type Task = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  lease_allowed: boolean;
};

type Run = {
  id: string;
  task_id: string;
  agent_id: string;
  status: string;
  result_summary: string;
};

type Agent = {
  id: string;
  name: string;
  risk_tier: string;
  auth_method: string;
};

type Playbook = {
  id: string;
  title: string;
  task_type: string;
  tags: string[];
};

const fallback = {
  secrets: [
    {
      id: "secret-1",
      display_name: "OpenAI production key",
      kind: "api_token",
      backend_ref: "openbao:secret-1",
    },
  ] satisfies Secret[],
  capabilities: [
    {
      id: "capability-1",
      name: "openai.chat.invoke",
      secret_id: "secret-1",
      allowed_mode: "proxy_only",
      risk_level: "medium",
      lease_ttl_seconds: 60,
    },
    {
      id: "capability-2",
      name: "github.repo.read",
      secret_id: "secret-1",
      allowed_mode: "proxy_or_lease",
      risk_level: "low",
      lease_ttl_seconds: 120,
    },
  ] satisfies Capability[],
  tasks: [
    {
      id: "task-1",
      title: "Sync QQ provider config",
      task_type: "config_sync",
      status: "pending",
      lease_allowed: false,
    },
    {
      id: "task-2",
      title: "Read GitHub repo metadata",
      task_type: "repo_read",
      status: "claimed",
      lease_allowed: true,
    },
  ] satisfies Task[],
  runs: [
    {
      id: "run-1",
      task_id: "task-2",
      agent_id: "agent-test",
      status: "completed",
      result_summary: "Fetched repository metadata through proxy call",
    },
  ] satisfies Run[],
  agents: [
    {
      id: "agent-test",
      name: "Test Agent",
      risk_tier: "medium",
      auth_method: "bearer",
    },
  ] satisfies Agent[],
  playbooks: [
    {
      id: "playbook-1",
      title: "QQ config sync",
      task_type: "config_sync",
      tags: ["qq", "config"],
    },
  ] satisfies Playbook[],
};

export function getApiBaseUrl() {
  return process.env.AGENT_CONTROL_PLANE_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

async function getItems<T>(path: string, fallbackItems: T[]): Promise<T[]> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return fallbackItems;
  }

  try {
    const response = await fetch(`${apiBase}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return fallbackItems;
    }
    const payload = (await response.json()) as { items: T[] };
    return payload.items;
  } catch {
    return fallbackItems;
  }
}

export async function getSecrets() {
  return getItems("/api/secrets", fallback.secrets);
}

export async function getCapabilities() {
  return getItems("/api/capabilities", fallback.capabilities);
}

export async function getTasks() {
  return getItems("/api/tasks", fallback.tasks);
}

export async function getRuns() {
  return getItems("/api/runs", fallback.runs);
}

export async function getAgents() {
  return getItems("/api/agents", fallback.agents);
}

export async function getPlaybooks() {
  return fallback.playbooks;
}
