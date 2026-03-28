"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApiBaseUrl } from "../lib/api";
import {
  clearManagementSessionCookie,
  getManagementSessionHeaders,
  persistManagementSessionCookie,
} from "../lib/management-session";

class ManagementRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parseJsonField(value: FormDataEntryValue | null, fallback: Record<string, unknown>) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

function parseListField(value: FormDataEntryValue | null): string[] {
  const raw = typeof value === "string" ? value : "";
  return raw
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseJsonArrayField(value: FormDataEntryValue | null): Record<string, unknown>[] {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array");
  }
  return parsed as Record<string, unknown>[];
}

function classifyManagementError(error: unknown) {
  if (error instanceof ManagementRequestError) {
    if (error.status === 400) {
      return "invalid-contract";
    }
    if (error.status === 401 || error.status === 403) {
      return "management-auth";
    }
    if (error.status === 503) {
      return "api-disconnected";
    }
  }

  return "save-failed";
}

async function postJson(path: string, payload: Record<string, unknown>) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new ManagementRequestError(503, "API base URL is not configured");
  }

  const managementHeaders = await getManagementSessionHeaders();
  if (!managementHeaders.Cookie) {
    throw new ManagementRequestError(401, "Management session is missing");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...managementHeaders,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401 || response.status === 403) {
      await clearManagementSessionCookie();
    }
    throw new ManagementRequestError(response.status, detail);
  }

  return response.json();
}

function getSafeNextPath(value: FormDataEntryValue | null, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.startsWith("/") ? raw : fallback;
}

export async function loginManagementAction(formData: FormData) {
  const apiBaseUrl = getApiBaseUrl();
  const bootstrapKey = String(formData.get("bootstrap_key") || "").trim();
  const nextPath = getSafeNextPath(formData.get("next"), "/secrets");

  if (!apiBaseUrl) {
    redirect(`/login?error=api-disconnected&next=${encodeURIComponent(nextPath)}`);
  }

  if (!bootstrapKey) {
    redirect(`/login?error=missing-credential&next=${encodeURIComponent(nextPath)}`);
  }

  const response = await fetch(`${apiBaseUrl}/api/session/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bootstrap_key: bootstrapKey }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorCode = response.status === 401 ? "invalid-credential" : "save-failed";
    redirect(`/login?error=${errorCode}&next=${encodeURIComponent(nextPath)}`);
  }

  const setCookieHeader = response.headers.get("set-cookie");
  if (!setCookieHeader) {
    redirect(`/login?error=session-cookie-missing&next=${encodeURIComponent(nextPath)}`);
  }

  await persistManagementSessionCookie(setCookieHeader);
  redirect(nextPath);
}

export async function logoutManagementAction() {
  const apiBaseUrl = getApiBaseUrl();
  const managementHeaders = await getManagementSessionHeaders();

  if (apiBaseUrl && managementHeaders.Cookie) {
    await fetch(`${apiBaseUrl}/api/session/logout`, {
      method: "POST",
      headers: managementHeaders,
      cache: "no-store",
    }).catch(() => undefined);
  }

  await clearManagementSessionCookie();
  redirect("/login?logged_out=1");
}

export async function createSecretAction(formData: FormData) {
  const displayName = String(formData.get("display_name") || "").trim();
  const kind = String(formData.get("kind") || "api_token").trim();
  const value = String(formData.get("value") || "").trim();
  const provider = String(formData.get("provider") || "").trim();
  const environment = String(formData.get("environment") || "").trim();
  const resourceSelector = String(formData.get("resource_selector") || "").trim();
  const providerScopes = parseListField(formData.get("provider_scopes"));

  if (!displayName || !value || !provider) {
    redirect("/secrets?error=missing-fields");
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = parseJsonField(formData.get("metadata"), {});
  } catch {
    redirect("/secrets?error=invalid-metadata");
  }

  try {
    await postJson("/api/secrets", {
      display_name: displayName,
      kind,
      value,
      provider,
      environment: environment || null,
      provider_scopes: providerScopes,
      resource_selector: resourceSelector || null,
      metadata,
    });
  } catch (error) {
    redirect(`/secrets?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/secrets");
  redirect(`/secrets?created=${encodeURIComponent(displayName)}`);
}

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const taskType = String(formData.get("task_type") || "").trim();
  const leaseAllowed = String(formData.get("lease_allowed") || "false") === "true";
  const approvalMode = String(formData.get("approval_mode") || "auto").trim();
  const playbookIds = parseListField(formData.get("playbook_ids"));

  if (!title || !taskType) {
    redirect("/tasks?error=missing-fields");
  }

  let input: Record<string, unknown>;
  try {
    input = parseJsonField(formData.get("input"), {});
  } catch {
    redirect("/tasks?error=invalid-input");
  }

  let approvalRules: Record<string, unknown>[];
  try {
    approvalRules = parseJsonArrayField(formData.get("approval_rules"));
  } catch {
    redirect("/tasks?error=invalid-policy");
  }

  try {
    await postJson("/api/tasks", {
      title,
      task_type: taskType,
      input,
      required_capability_ids: [],
      playbook_ids: playbookIds,
      lease_allowed: leaseAllowed,
      approval_mode: approvalMode,
      approval_rules: approvalRules,
    });
  } catch (error) {
    if (error instanceof ManagementRequestError && error.status === 400) {
      redirect("/tasks?error=invalid-playbooks");
    }
    redirect(`/tasks?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/tasks");
  redirect(`/tasks?created=${encodeURIComponent(title)}`);
}

export async function createAgentAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const riskTier = String(formData.get("risk_tier") || "medium").trim();
  const allowedTaskTypes = parseListField(formData.get("allowed_task_types"));
  const allowedCapabilityIds = parseListField(formData.get("allowed_capability_ids"));

  if (!name) {
    redirect("/agents?error=missing-name");
  }

  let result: { api_key?: string; id?: string };
  try {
    result = await postJson("/api/agents", {
      name,
      risk_tier: riskTier,
      allowed_task_types: allowedTaskTypes,
      allowed_capability_ids: allowedCapabilityIds,
    });
  } catch (error) {
    redirect(`/agents?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/agents");
  redirect(`/agents?created=${encodeURIComponent(name)}&api_key=${encodeURIComponent(result.api_key || "")}`);
}

export async function createCapabilityAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const secretId = String(formData.get("secret_id") || "").trim();
  const allowedMode = String(formData.get("allowed_mode") || "proxy_only").trim();
  const riskLevel = String(formData.get("risk_level") || "medium").trim();
  const approvalMode = String(formData.get("approval_mode") || "auto").trim();
  const adapterType = String(formData.get("adapter_type") || "generic_http").trim();
  const leaseTtlRaw = String(formData.get("lease_ttl_seconds") || "60").trim();
  const requiredProvider = String(formData.get("required_provider") || "").trim();
  const requiredProviderScopes = parseListField(formData.get("required_provider_scopes"));
  const allowedEnvironments = parseListField(formData.get("allowed_environments"));
  const leaseTtlSeconds = Number.parseInt(leaseTtlRaw, 10);
  let approvalRules: Record<string, unknown>[];
  let adapterConfig: Record<string, unknown>;

  if (
    !name ||
    !secretId ||
    !requiredProvider ||
    Number.isNaN(leaseTtlSeconds) ||
    leaseTtlSeconds < 1
  ) {
    redirect("/capabilities?error=invalid-fields");
  }

  try {
    approvalRules = parseJsonArrayField(formData.get("approval_rules"));
  } catch {
    redirect("/capabilities?error=invalid-policy");
  }

  try {
    adapterConfig = parseJsonField(formData.get("adapter_config"), {});
  } catch {
    redirect("/capabilities?error=invalid-adapter-config");
  }

  try {
    await postJson("/api/capabilities", {
      name,
      secret_id: secretId,
      allowed_mode: allowedMode,
      risk_level: riskLevel,
      approval_mode: approvalMode,
      approval_rules: approvalRules,
      lease_ttl_seconds: leaseTtlSeconds,
      required_provider: requiredProvider,
      required_provider_scopes: requiredProviderScopes,
      allowed_environments: allowedEnvironments,
      adapter_type: adapterType,
      adapter_config: adapterConfig,
    });
  } catch (error) {
    redirect(`/capabilities?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/capabilities");
  redirect(`/capabilities?created=${encodeURIComponent(name)}`);
}

export async function approveApprovalAction(formData: FormData) {
  const approvalId = String(formData.get("approval_id") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const nextPath = getSafeNextPath(formData.get("next"), "/approvals");

  if (!approvalId) {
    redirect(`${nextPath}?error=missing-approval`);
  }

  try {
    await postJson(`/api/approvals/${approvalId}/approve`, {
      reason,
    });
  } catch (error) {
    redirect(`${nextPath}?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/approvals");
  revalidatePath("/tasks");
  revalidatePath("/runs");
  redirect(`${nextPath}?updated=${encodeURIComponent(approvalId)}`);
}

export async function rejectApprovalAction(formData: FormData) {
  const approvalId = String(formData.get("approval_id") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const nextPath = getSafeNextPath(formData.get("next"), "/approvals");

  if (!approvalId) {
    redirect(`${nextPath}?error=missing-approval`);
  }

  if (!reason) {
    redirect(`${nextPath}?error=missing-reason`);
  }

  try {
    await postJson(`/api/approvals/${approvalId}/reject`, {
      reason,
    });
  } catch (error) {
    redirect(`${nextPath}?error=${classifyManagementError(error)}`);
  }

  revalidatePath("/approvals");
  revalidatePath("/tasks");
  revalidatePath("/runs");
  redirect(`${nextPath}?updated=${encodeURIComponent(approvalId)}`);
}
