export type Secret = {
  id: string;
  display_name: string;
  kind: string;
  backend_ref: string;
  provider: string;
  environment: string | null;
  provider_scopes: string[];
  resource_selector: string | null;
  metadata: Record<string, unknown>;
};

export type Capability = {
  id: string;
  name: string;
  secret_id: string;
  allowed_mode: string;
  risk_level: string;
  lease_ttl_seconds: number;
  required_provider: string;
  required_provider_scopes: string[];
  allowed_environments: string[];
};

export type Task = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  lease_allowed: boolean;
};

export type Run = {
  id: string;
  task_id: string;
  agent_id: string;
  status: string;
  result_summary: string;
};

export type Agent = {
  id: string;
  name: string;
  risk_tier: string;
  auth_method: string;
};

export type Playbook = {
  id: string;
  title: string;
  task_type: string;
  tags: string[];
};

export type CollectionSource = "live" | "demo" | "disconnected" | "error";

export type CollectionResult<T> = {
  items: T[];
  source: CollectionSource;
  error?: string;
};

const demoFallback = {
  secrets: [
    {
      id: "secret-demo-1",
      display_name: "Demo OpenAI key",
      kind: "api_token",
      backend_ref: "memory:secret-demo-1",
      provider: "openai",
      environment: "demo",
      provider_scopes: ["responses.read"],
      resource_selector: "workspace:demo",
      metadata: { owner: "demo" },
    },
  ] satisfies Secret[],
  capabilities: [
    {
      id: "capability-demo-1",
      name: "openai.chat.invoke",
      secret_id: "secret-demo-1",
      allowed_mode: "proxy_only",
      risk_level: "medium",
      lease_ttl_seconds: 60,
      required_provider: "openai",
      required_provider_scopes: ["responses.read"],
      allowed_environments: ["demo"],
    },
  ] satisfies Capability[],
  tasks: [
    {
      id: "task-demo-1",
      title: "Demo prompt run",
      task_type: "prompt_run",
      status: "pending",
      lease_allowed: false,
    },
  ] satisfies Task[],
  runs: [] satisfies Run[],
  agents: [
    {
      id: "agent-demo",
      name: "Demo Agent",
      risk_tier: "medium",
      auth_method: "api_key",
    },
  ] satisfies Agent[],
  playbooks: [
    {
      id: "playbook-demo-1",
      title: "Demo prompt run",
      task_type: "prompt_run",
      tags: ["demo"],
    },
  ] satisfies Playbook[],
};

const DEMO_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export function getApiBaseUrl() {
  return process.env.AGENT_CONTROL_PLANE_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

export function getApiDocsLinks() {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return null;
  }

  return {
    swaggerUrl: `${apiBase}/docs`,
    openapiUrl: `${apiBase}/openapi.json`,
  };
}

function isDemoModeEnabled() {
  const raw =
    process.env.AGENT_CONTROL_PLANE_DEMO_MODE ??
    process.env.NEXT_PUBLIC_AGENT_CONTROL_PLANE_DEMO_MODE ??
    "";
  return DEMO_ENV_VALUES.has(raw.trim().toLowerCase());
}

function getBootstrapHeaders(): Record<string, string> {
  const key = process.env.BOOTSTRAP_AGENT_KEY ?? "";
  if (!key) {
    return {};
  }
  return { Authorization: `Bearer ${key}` };
}

function disconnectedResult<T>(demoItems: T[]): CollectionResult<T> {
  if (isDemoModeEnabled()) {
    return {
      items: demoItems,
      source: "demo",
    };
  }
  return {
    items: [],
    source: "disconnected",
    error: "AGENT_CONTROL_PLANE_API_URL is not configured.",
  };
}

async function getCollection<T>(
  path: string,
  demoItems: T[],
  options: { includeManagementAuth?: boolean } = {},
): Promise<CollectionResult<T>> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return disconnectedResult(demoItems);
  }

  try {
    const headers = options.includeManagementAuth === false ? {} : getBootstrapHeaders();
    const response = await fetch(`${apiBase}${path}`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        items: [],
        source: "error",
        error: `${response.status} ${detail || response.statusText}`.trim(),
      };
    }

    const payload = (await response.json()) as { items?: T[] };
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      source: "live",
    };
  } catch (error) {
    return {
      items: [],
      source: "error",
      error: error instanceof Error ? error.message : "Failed to reach API backend.",
    };
  }
}

export function getCollectionNotice<T>(
  result: CollectionResult<T>,
  label: string,
): {
  tone: "success" | "warning" | "error";
  message: string;
} {
  if (result.source === "live") {
    return {
      tone: "success",
      message: `live API connected for ${label}.`,
    };
  }

  if (result.source === "demo") {
    return {
      tone: "warning",
      message:
        `Demo mode is enabled for ${label}. ` +
        "Unset AGENT_CONTROL_PLANE_DEMO_MODE and set AGENT_CONTROL_PLANE_API_URL for live data.",
    };
  }

  if (result.source === "disconnected") {
    return {
      tone: "warning",
      message:
        `Disconnected while loading ${label}. ` +
        "Set AGENT_CONTROL_PLANE_API_URL to your API base URL.",
    };
  }

  const detail = result.error ?? "Unknown backend error.";
  if (detail.startsWith("401") || detail.startsWith("403")) {
    return {
      tone: "error",
      message:
        `Authorization error while loading ${label}: ${detail}. ` +
        "Check BOOTSTRAP_AGENT_KEY for management routes.",
    };
  }

  return {
    tone: "error",
    message: `Failed to load ${label}: ${detail}`,
  };
}

export async function getSecrets() {
  return getCollection("/api/secrets", demoFallback.secrets);
}

export async function getCapabilities() {
  return getCollection("/api/capabilities", demoFallback.capabilities);
}

export async function getTasks() {
  return getCollection("/api/tasks", demoFallback.tasks);
}

export async function getRuns() {
  return getCollection("/api/runs", demoFallback.runs);
}

export async function getAgents() {
  return getCollection("/api/agents", demoFallback.agents);
}

export async function getPlaybooks() {
  return getCollection("/api/playbooks/search", demoFallback.playbooks);
}
