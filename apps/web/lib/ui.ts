import type { Locale } from "./i18n-shared";
import { tr } from "./i18n-shared";

export function taskStatusLabel(locale: Locale, status: string) {
  switch (status) {
    case "completed":
      return tr(locale, "Completed", "已完成");
    case "claimed":
      return tr(locale, "Claimed", "进行中");
    case "pending":
      return tr(locale, "Pending", "待认领");
    case "failed":
      return tr(locale, "Failed", "失败");
    default:
      return status;
  }
}

export function approvalStatusLabel(locale: Locale, status: string) {
  switch (status) {
    case "approved":
      return tr(locale, "Approved", "已批准");
    case "rejected":
      return tr(locale, "Rejected", "已拒绝");
    case "pending":
      return tr(locale, "Pending", "待处理");
    default:
      return status;
  }
}

export function approvalModeLabel(locale: Locale, mode: string) {
  return mode === "manual"
    ? tr(locale, "Manual review", "人工复核")
    : tr(locale, "Auto review", "自动放行");
}

export function leasePolicyLabel(locale: Locale, leaseAllowed: boolean) {
  return leaseAllowed
    ? tr(locale, "Lease allowed", "可申请租约")
    : tr(locale, "Proxy only", "仅代理");
}

export function capabilityModeLabel(locale: Locale, mode: string) {
  switch (mode) {
    case "proxy_only":
      return tr(locale, "Proxy only", "仅代理");
    case "proxy_or_lease":
      return tr(locale, "Proxy or lease", "代理或租约");
    default:
      return mode;
  }
}

export function actionTypeLabel(locale: Locale, actionType: string) {
  switch (actionType) {
    case "invoke":
      return tr(locale, "Invoke", "调用");
    case "lease":
      return tr(locale, "Lease request", "申请租约");
    case "complete":
      return tr(locale, "Complete task", "完成任务");
    default:
      return actionType;
  }
}

export function riskLevelLabel(locale: Locale, level: string) {
  switch (level) {
    case "low":
      return tr(locale, "Low risk", "低风险");
    case "medium":
      return tr(locale, "Medium risk", "中风险");
    case "high":
      return tr(locale, "High risk", "高风险");
    default:
      return level;
  }
}

export function adapterTypeLabel(locale: Locale, adapterType: string) {
  switch (adapterType) {
    case "generic_http":
      return tr(locale, "Generic HTTP adapter", "通用 HTTP 适配器");
    case "openai":
      return tr(locale, "OpenAI adapter", "OpenAI 适配器");
    case "github":
      return tr(locale, "GitHub adapter", "GitHub 适配器");
    default:
      return tr(locale, `${adapterType} adapter`, `${adapterType} 适配器`);
  }
}

export function docsLabel(locale: Locale, kind: "swagger" | "openapi") {
  return kind === "swagger"
    ? tr(locale, "Swagger UI", "API 文档")
    : tr(locale, "OpenAPI JSON", "OpenAPI 描述");
}

export function runtimeKeyLabel(locale: Locale) {
  return tr(locale, "Agent API key", "Agent 访问密钥");
}

export function managementCredentialLabel(locale: Locale) {
  return tr(locale, "Bootstrap management credential", "管理引导口令");
}

export function agentsCatalogLabel(locale: Locale) {
  return tr(locale, "Agents", "Agent 列表");
}

export function agentSelfServeLabel(locale: Locale) {
  return tr(locale, "Agent self-serve", "Agent 自助台");
}

export function agentLabel(locale: Locale) {
  return tr(locale, "Agent", "Agent");
}
