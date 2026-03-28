import { getManagementSessionHeaders } from "./management-session";
import type { Locale } from "./i18n-shared";
import { tr } from "./i18n-shared";
import type { IntakeCatalogResponse } from "./forms";

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
  approval_mode: string;
  approval_rules: Array<Record<string, unknown>>;
  lease_ttl_seconds: number;
  required_provider: string;
  required_provider_scopes: string[];
  allowed_environments: string[];
  adapter_type: string;
  adapter_config: Record<string, unknown>;
};

export type Task = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  lease_allowed: boolean;
  approval_mode: string;
  approval_rules: Array<Record<string, unknown>>;
  playbook_ids: string[];
};

export type ApprovalRequest = {
  id: string;
  task_id: string;
  capability_id: string;
  agent_id: string;
  action_type: string;
  status: string;
  reason: string;
  policy_reason: string;
  policy_source: string | null;
  requested_by: string;
  decided_by: string | null;
  expires_at: string | null;
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
  body: string;
  tags: string[];
};

export type PlaybookSearchMeta = {
  total: number;
  items_count: number;
  applied_filters: Record<string, string>;
};

export type PlaybookSearchFilters = {
  taskType?: string;
  q?: string;
  tag?: string;
};

export type PlaybookCollectionResult = CollectionResult<Playbook> & {
  meta: PlaybookSearchMeta;
};

export type ItemResult<T> = {
  item: T | null;
  source: CollectionSource;
  error?: string;
};

export type CollectionSource = "live" | "demo" | "disconnected" | "error";

export type CollectionResult<T> = {
  items: T[];
  source: CollectionSource;
  error?: string;
};

function disconnectedItemResult<T>(): ItemResult<T> {
  return {
    item: null,
    source: "disconnected",
    error: "AGENT_CONTROL_PLANE_API_URL is not configured.",
  };
}

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
      approval_mode: "auto",
      approval_rules: [],
      lease_ttl_seconds: 60,
      required_provider: "openai",
      required_provider_scopes: ["responses.read"],
      allowed_environments: ["demo"],
      adapter_type: "openai",
      adapter_config: { model: "gpt-4.1-mini" },
    },
  ] satisfies Capability[],
  tasks: [
    {
      id: "task-demo-1",
      title: "Demo prompt run",
      task_type: "prompt_run",
      status: "pending",
      lease_allowed: false,
      approval_mode: "auto",
      approval_rules: [],
      playbook_ids: ["playbook-demo-1"],
    },
  ] satisfies Task[],
  approvals: [] satisfies ApprovalRequest[],
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
      body: "Validate prompt input, invoke the capability, then store a short run summary.",
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
    const headers = options.includeManagementAuth === false ? {} : await getManagementSessionHeaders();
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
  locale: Locale = "en",
): {
  tone: "success" | "warning" | "error";
  message: string;
} {
  if (result.source === "live") {
    return {
      tone: "success",
      message: tr(locale, `live API connected for ${label}.`, `已连接实时 API：${label}。`),
    };
  }

  if (result.source === "demo") {
    return {
      tone: "warning",
      message:
        tr(
          locale,
          `Demo mode is enabled for ${label}. ` +
            "Unset AGENT_CONTROL_PLANE_DEMO_MODE and set AGENT_CONTROL_PLANE_API_URL for live data.",
          `${label} 已启用 Demo 模式。取消 AGENT_CONTROL_PLANE_DEMO_MODE，并设置 AGENT_CONTROL_PLANE_API_URL 以获取实时数据。`,
        ),
    };
  }

  if (result.source === "disconnected") {
    return {
      tone: "warning",
      message:
        tr(
          locale,
          `Disconnected while loading ${label}. ` +
            "Set AGENT_CONTROL_PLANE_API_URL to your API base URL.",
          `加载 ${label} 时连接断开。请设置 AGENT_CONTROL_PLANE_API_URL 为 API Base URL。`,
        ),
    };
  }

  const detail = result.error ?? "Unknown backend error.";
  if (detail.startsWith("401")) {
    return {
      tone: "error",
      message:
        tr(
          locale,
          `Authorization error while loading ${label}: ${detail}. ` +
            "Check the management session or sign in again.",
          `加载 ${label} 时发生授权错误：${detail}。请检查管理会话或重新登录。`,
        ),
    };
  }

  if (detail.startsWith("403")) {
    return {
      tone: "error",
      message:
        tr(
          locale,
          `Permission denied while loading ${label}: ${detail}. ` +
            "Use a management session with the required role.",
          `加载 ${label} 时权限不足：${detail}。请使用具备所需角色的管理会话。`,
        ),
    };
  }

  return {
    tone: "error",
    message: tr(locale, `Failed to load ${label}: ${detail}`, `加载 ${label} 失败：${detail}`),
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
  return getCollection<Run>("/api/runs", demoFallback.runs);
}

export async function getApprovals(status?: ApprovalRequest["status"]) {
  const path = status
    ? `/api/approvals?status=${encodeURIComponent(status)}`
    : "/api/approvals";
  return getCollection(path, demoFallback.approvals);
}

export async function getAgents() {
  return getCollection("/api/agents", demoFallback.agents);
}

export async function getPlaybooks() {
  return getPlaybookSearch();
}

function getDefaultPlaybookMeta(): PlaybookSearchMeta {
  return {
    total: 0,
    items_count: 0,
    applied_filters: {},
  };
}

export async function getPlaybookSearch(
  filters: PlaybookSearchFilters = {},
): Promise<PlaybookCollectionResult> {
  const params = new URLSearchParams();
  if (filters.taskType) {
    params.set("task_type", filters.taskType);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  const path = params.size > 0
    ? `/api/playbooks/search?${params.toString()}`
    : "/api/playbooks/search";
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    const disconnected = disconnectedResult(demoFallback.playbooks);
    return {
      ...disconnected,
      meta: {
        total: disconnected.items.length,
        items_count: disconnected.items.length,
        applied_filters: {},
      },
    };
  }

  try {
    const headers = await getManagementSessionHeaders();
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
        meta: getDefaultPlaybookMeta(),
      };
    }

    const payload = (await response.json()) as {
      items?: Playbook[];
      meta?: Partial<PlaybookSearchMeta>;
    };
    const items = Array.isArray(payload.items) ? payload.items : [];
    const meta = payload.meta ?? {};
    return {
      items,
      source: "live",
      meta: {
        total: typeof meta.total === "number" ? meta.total : items.length,
        items_count: typeof meta.items_count === "number" ? meta.items_count : items.length,
        applied_filters: typeof meta.applied_filters === "object" && meta.applied_filters
          ? meta.applied_filters
          : {},
      },
    };
  } catch (error) {
    return {
      items: [],
      source: "error",
      error: error instanceof Error ? error.message : "Failed to reach API backend.",
      meta: getDefaultPlaybookMeta(),
    };
  }
}

export async function getPlaybookById(playbookId: string): Promise<ItemResult<Playbook>> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    if (isDemoModeEnabled()) {
      const demoItem = demoFallback.playbooks.find((item) => item.id === playbookId) ?? null;
      return {
        item: demoItem,
        source: "demo",
      };
    }
    return {
      item: null,
      source: "disconnected",
      error: "AGENT_CONTROL_PLANE_API_URL is not configured.",
    };
  }

  try {
    const headers = await getManagementSessionHeaders();
    const response = await fetch(`${apiBase}/api/playbooks/${encodeURIComponent(playbookId)}`, {
      cache: "no-store",
      headers,
    });
    if (response.status === 404) {
      return {
        item: null,
        source: "error",
        error: "404 playbook not found",
      };
    }
    if (!response.ok) {
      const detail = await response.text();
      return {
        item: null,
        source: "error",
        error: `${response.status} ${detail || response.statusText}`.trim(),
      };
    }
    return {
      item: (await response.json()) as Playbook,
      source: "live",
    };
  } catch (error) {
    return {
      item: null,
      source: "error",
      error: error instanceof Error ? error.message : "Failed to reach API backend.",
    };
  }
}

export async function getIntakeCatalog(): Promise<ItemResult<IntakeCatalogResponse>> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return disconnectedItemResult();
  }

  try {
    const headers = await getManagementSessionHeaders();
    const response = await fetch(`${apiBase}/api/intake-catalog`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        item: null,
        source: "error",
        error: `${response.status} ${detail || response.statusText}`.trim(),
      };
    }

    return {
      item: (await response.json()) as IntakeCatalogResponse,
      source: "live",
    };
  } catch (error) {
    return {
      item: null,
      source: "error",
      error: error instanceof Error ? error.message : "Failed to reach API backend.",
    };
  }
}
