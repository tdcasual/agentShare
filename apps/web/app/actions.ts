"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApiBaseUrl } from "../lib/api";

function parseJsonField(value: FormDataEntryValue | null, fallback: Record<string, unknown>) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

async function postJson(path: string, payload: Record<string, unknown>) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request failed: ${response.status} ${detail}`);
  }

  return response.json();
}

export async function createSecretAction(formData: FormData) {
  const displayName = String(formData.get("display_name") || "").trim();
  const kind = String(formData.get("kind") || "api_token").trim();
  const value = String(formData.get("value") || "").trim();

  if (!displayName || !value) {
    redirect("/secrets?error=missing-fields");
  }

  let scope: Record<string, unknown>;
  try {
    scope = parseJsonField(formData.get("scope"), {});
  } catch {
    redirect("/secrets?error=invalid-scope");
  }

  try {
    await postJson("/api/secrets", {
      display_name: displayName,
      kind,
      value,
      scope,
    });
  } catch {
    redirect("/secrets?error=save-failed");
  }

  revalidatePath("/secrets");
  redirect(`/secrets?created=${encodeURIComponent(displayName)}`);
}

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const taskType = String(formData.get("task_type") || "").trim();
  const leaseAllowed = String(formData.get("lease_allowed") || "false") === "true";

  if (!title || !taskType) {
    redirect("/tasks?error=missing-fields");
  }

  let input: Record<string, unknown>;
  try {
    input = parseJsonField(formData.get("input"), {});
  } catch {
    redirect("/tasks?error=invalid-input");
  }

  try {
    await postJson("/api/tasks", {
      title,
      task_type: taskType,
      input,
      required_capability_ids: [],
      lease_allowed: leaseAllowed,
    });
  } catch {
    redirect("/tasks?error=save-failed");
  }

  revalidatePath("/tasks");
  redirect(`/tasks?created=${encodeURIComponent(title)}`);
}

export async function createCapabilityAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const secretId = String(formData.get("secret_id") || "").trim();
  const allowedMode = String(formData.get("allowed_mode") || "proxy_only").trim();
  const riskLevel = String(formData.get("risk_level") || "medium").trim();
  const leaseTtlRaw = String(formData.get("lease_ttl_seconds") || "60").trim();
  const leaseTtlSeconds = Number.parseInt(leaseTtlRaw, 10);

  if (!name || !secretId || Number.isNaN(leaseTtlSeconds) || leaseTtlSeconds < 1) {
    redirect("/capabilities?error=invalid-fields");
  }

  try {
    await postJson("/api/capabilities", {
      name,
      secret_id: secretId,
      allowed_mode: allowedMode,
      risk_level: riskLevel,
      lease_ttl_seconds: leaseTtlSeconds,
    });
  } catch {
    redirect("/capabilities?error=save-failed");
  }

  revalidatePath("/capabilities");
  redirect(`/capabilities?created=${encodeURIComponent(name)}`);
}
