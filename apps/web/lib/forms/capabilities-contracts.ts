import type { Locale } from "../i18n-shared";

import type { FieldOption, IntakeVariantContract, ValidationErrors } from "./types";
import {
  mergeValidationErrors,
  validateJsonField,
  validatePositiveIntegerField,
  validateRequiredFields,
} from "./validators";

export type SecretBindingOption = {
  id: string;
  display_name: string;
  kind: string;
};

export const defaultCapabilityVariant = "generic_capability";

function validateCapability(
  contract: IntakeVariantContract,
  values: Record<string, string | boolean>,
  locale: Locale,
): ValidationErrors {
  const errors = validateRequiredFields(contract, values, locale);
  const adapterConfigError = validateJsonField(
    String(values.adapter_config ?? "{}"),
    locale === "zh" ? "适配器配置 JSON" : "Adapter config JSON",
    locale,
    "object",
  );
  const approvalRulesError = validateJsonField(
    String(values.approval_rules ?? "[]"),
    locale === "zh" ? "策略规则 JSON" : "Policy rules JSON",
    locale,
    "array",
  );
  const ttlError = validatePositiveIntegerField(
    String(values.lease_ttl_seconds ?? "60"),
    locale === "zh" ? "租约时长" : "Lease TTL",
    locale,
  );

  if (adapterConfigError) {
    errors.adapter_config = adapterConfigError;
  }
  if (approvalRulesError) {
    errors.approval_rules = approvalRulesError;
  }
  if (ttlError) {
    errors.lease_ttl_seconds = ttlError;
  }

  return mergeValidationErrors(errors);
}

function toSecretOptions(secrets: SecretBindingOption[]): FieldOption[] {
  return secrets.map((secret) => ({
    value: secret.id,
    label: {
      en: secret.display_name,
      zh: secret.display_name,
    },
  }));
}

export function buildCapabilityContracts(secrets: SecretBindingOption[]): IntakeVariantContract[] {
  const secretOptions = toSecretOptions(secrets);

  return [
    {
      resourceKind: "capability",
      variant: "generic_capability",
      title: { en: "Generic capability", zh: "通用能力" },
      summary: { en: "Manual binding with full adapter and provider control.", zh: "手动绑定，完整控制适配器与提供方。" },
      sections: [
        {
          id: "basic",
          title: { en: "Basic fields", zh: "基础字段" },
          fields: [
            { key: "name", control: "text", label: { en: "Capability name", zh: "能力名称" }, required: true },
            {
              key: "secret_id",
              control: "select",
              label: { en: "Bound secret", zh: "绑定密钥" },
              options: secretOptions,
              optionsSource: "management_secret_inventory",
              defaultValue: secretOptions[0]?.value ?? "",
              required: true,
            },
            {
              key: "allowed_mode",
              control: "select",
              label: { en: "Allowed mode", zh: "允许模式" },
              defaultValue: "proxy_only",
              options: [
                { value: "proxy_only", label: { en: "Proxy only", zh: "仅代理" } },
                { value: "proxy_or_lease", label: { en: "Proxy or lease", zh: "代理或租约" } },
              ],
              required: true,
            },
            {
              key: "risk_level",
              control: "select",
              label: { en: "Risk level", zh: "风险等级" },
              defaultValue: "medium",
              options: [
                { value: "low", label: { en: "Low", zh: "低" } },
                { value: "medium", label: { en: "Medium", zh: "中" } },
                { value: "high", label: { en: "High", zh: "高" } },
              ],
              required: true,
            },
            {
              key: "lease_ttl_seconds",
              control: "number",
              label: { en: "Lease TTL", zh: "租约时长（秒）" },
              defaultValue: "60",
              required: true,
            },
            {
              key: "adapter_type",
              control: "select",
              label: { en: "Adapter type", zh: "适配器类型" },
              defaultValue: "generic_http",
              options: [
                { value: "generic_http", label: { en: "generic_http", zh: "generic_http" } },
                { value: "openai", label: { en: "openai", zh: "openai" } },
                { value: "github", label: { en: "github", zh: "github" } },
              ],
              required: true,
            },
            {
              key: "required_provider",
              control: "text",
              label: { en: "Required provider", zh: "要求的服务提供方" },
              required: true,
            },
            {
              key: "approval_mode",
              control: "select",
              label: { en: "Approval mode", zh: "审批模式" },
              defaultValue: "auto",
              options: [
                { value: "auto", label: { en: "Auto", zh: "自动" } },
                { value: "manual", label: { en: "Manual review", zh: "人工复核" } },
              ],
              required: true,
            },
            {
              key: "adapter_config",
              control: "json",
              label: { en: "Adapter config JSON", zh: "适配器配置 JSON" },
              defaultValue: "{}",
              advanced: true,
            },
            {
              key: "approval_rules",
              control: "json",
              label: { en: "Policy rules JSON", zh: "策略规则 JSON" },
              defaultValue: "[]",
              advanced: true,
            },
            {
              key: "required_provider_scopes",
              control: "chips",
              label: { en: "Required provider scopes", zh: "要求的服务提供方权限" },
              advanced: true,
            },
            {
              key: "allowed_environments",
              control: "chips",
              label: { en: "Allowed environments", zh: "允许环境" },
              advanced: true,
            },
          ],
        },
      ],
      serialize(values) {
        return {
          name: String(values.name ?? ""),
          secret_id: String(values.secret_id ?? ""),
          allowed_mode: String(values.allowed_mode ?? "proxy_only"),
          risk_level: String(values.risk_level ?? "medium"),
          lease_ttl_seconds: String(values.lease_ttl_seconds ?? "60"),
          adapter_type: String(values.adapter_type ?? "generic_http"),
          required_provider: String(values.required_provider ?? ""),
          approval_mode: String(values.approval_mode ?? "auto"),
          adapter_config: String(values.adapter_config ?? "{}"),
          approval_rules: String(values.approval_rules ?? "[]"),
          required_provider_scopes: String(values.required_provider_scopes ?? ""),
          allowed_environments: String(values.allowed_environments ?? ""),
        };
      },
      validate(values, locale) {
        return validateCapability(this, values, locale);
      },
    },
    {
      resourceKind: "capability",
      variant: "openai_chat_proxy",
      title: { en: "OpenAI chat proxy", zh: "OpenAI 聊天代理能力" },
      summary: { en: "Preset for OpenAI-backed proxy execution.", zh: "面向 OpenAI 代理执行的预设模板。" },
      sections: [
        {
          id: "basic",
          title: { en: "Basic fields", zh: "基础字段" },
          fields: [
            { key: "name", control: "text", label: { en: "Capability name", zh: "能力名称" }, defaultValue: "openai.chat.invoke", required: true },
            {
              key: "secret_id",
              control: "select",
              label: { en: "Bound secret", zh: "绑定密钥" },
              options: secretOptions,
              optionsSource: "management_secret_inventory",
              defaultValue: secretOptions[0]?.value ?? "",
              required: true,
            },
            {
              key: "allowed_mode",
              control: "select",
              label: { en: "Allowed mode", zh: "允许模式" },
              defaultValue: "proxy_only",
              options: [
                { value: "proxy_only", label: { en: "Proxy only", zh: "仅代理" } },
                { value: "proxy_or_lease", label: { en: "Proxy or lease", zh: "代理或租约" } },
              ],
              required: true,
            },
            {
              key: "risk_level",
              control: "select",
              label: { en: "Risk level", zh: "风险等级" },
              defaultValue: "medium",
              options: [
                { value: "low", label: { en: "Low", zh: "低" } },
                { value: "medium", label: { en: "Medium", zh: "中" } },
                { value: "high", label: { en: "High", zh: "高" } },
              ],
              required: true,
            },
            {
              key: "lease_ttl_seconds",
              control: "number",
              label: { en: "Lease TTL", zh: "租约时长（秒）" },
              defaultValue: "60",
              required: true,
            },
            {
              key: "adapter_type",
              control: "text",
              label: { en: "Adapter type", zh: "适配器类型" },
              defaultValue: "openai",
              readOnly: true,
              required: true,
            },
            {
              key: "required_provider",
              control: "text",
              label: { en: "Required provider", zh: "要求的服务提供方" },
              defaultValue: "openai",
              readOnly: true,
              required: true,
            },
            {
              key: "approval_mode",
              control: "select",
              label: { en: "Approval mode", zh: "审批模式" },
              defaultValue: "auto",
              options: [
                { value: "auto", label: { en: "Auto", zh: "自动" } },
                { value: "manual", label: { en: "Manual review", zh: "人工复核" } },
              ],
              required: true,
            },
            {
              key: "required_provider_scopes",
              control: "chips",
              label: { en: "Required provider scopes", zh: "要求的服务提供方权限" },
              defaultValue: "responses.read",
              advanced: true,
            },
            {
              key: "allowed_environments",
              control: "chips",
              label: { en: "Allowed environments", zh: "允许环境" },
              defaultValue: "production",
              advanced: true,
            },
            {
              key: "adapter_config",
              control: "json",
              label: { en: "Adapter config JSON", zh: "适配器配置 JSON" },
              defaultValue: "{}",
              advanced: true,
            },
            {
              key: "approval_rules",
              control: "json",
              label: { en: "Policy rules JSON", zh: "策略规则 JSON" },
              defaultValue: "[]",
              advanced: true,
            },
          ],
        },
      ],
      serialize(values) {
        return {
          name: String(values.name ?? "openai.chat.invoke"),
          secret_id: String(values.secret_id ?? ""),
          allowed_mode: String(values.allowed_mode ?? "proxy_only"),
          risk_level: String(values.risk_level ?? "medium"),
          lease_ttl_seconds: String(values.lease_ttl_seconds ?? "60"),
          adapter_type: "openai",
          required_provider: "openai",
          approval_mode: String(values.approval_mode ?? "auto"),
          adapter_config: String(values.adapter_config ?? "{}"),
          approval_rules: String(values.approval_rules ?? "[]"),
          required_provider_scopes: String(values.required_provider_scopes ?? "responses.read"),
          allowed_environments: String(values.allowed_environments ?? "production"),
        };
      },
      validate(values, locale) {
        return validateCapability(this, values, locale);
      },
    },
    {
      resourceKind: "capability",
      variant: "github_rest_proxy",
      title: { en: "GitHub REST proxy", zh: "GitHub REST 代理能力" },
      summary: { en: "Preset for GitHub repository-scoped proxy operations.", zh: "面向 GitHub 仓库范围代理操作的预设模板。" },
      sections: [
        {
          id: "basic",
          title: { en: "Basic fields", zh: "基础字段" },
          fields: [
            { key: "name", control: "text", label: { en: "Capability name", zh: "能力名称" }, defaultValue: "github.repo.sync", required: true },
            {
              key: "secret_id",
              control: "select",
              label: { en: "Bound secret", zh: "绑定密钥" },
              options: secretOptions,
              optionsSource: "management_secret_inventory",
              defaultValue: secretOptions[0]?.value ?? "",
              required: true,
            },
            {
              key: "allowed_mode",
              control: "select",
              label: { en: "Allowed mode", zh: "允许模式" },
              defaultValue: "proxy_or_lease",
              options: [
                { value: "proxy_only", label: { en: "Proxy only", zh: "仅代理" } },
                { value: "proxy_or_lease", label: { en: "Proxy or lease", zh: "代理或租约" } },
              ],
              required: true,
            },
            {
              key: "risk_level",
              control: "select",
              label: { en: "Risk level", zh: "风险等级" },
              defaultValue: "medium",
              options: [
                { value: "low", label: { en: "Low", zh: "低" } },
                { value: "medium", label: { en: "Medium", zh: "中" } },
                { value: "high", label: { en: "High", zh: "高" } },
              ],
              required: true,
            },
            {
              key: "lease_ttl_seconds",
              control: "number",
              label: { en: "Lease TTL", zh: "租约时长（秒）" },
              defaultValue: "180",
              required: true,
            },
            {
              key: "adapter_type",
              control: "text",
              label: { en: "Adapter type", zh: "适配器类型" },
              defaultValue: "github",
              readOnly: true,
              required: true,
            },
            {
              key: "required_provider",
              control: "text",
              label: { en: "Required provider", zh: "要求的服务提供方" },
              defaultValue: "github",
              readOnly: true,
              required: true,
            },
            {
              key: "approval_mode",
              control: "select",
              label: { en: "Approval mode", zh: "审批模式" },
              defaultValue: "auto",
              options: [
                { value: "auto", label: { en: "Auto", zh: "自动" } },
                { value: "manual", label: { en: "Manual review", zh: "人工复核" } },
              ],
              required: true,
            },
            {
              key: "required_provider_scopes",
              control: "chips",
              label: { en: "Required provider scopes", zh: "要求的服务提供方权限" },
              defaultValue: "repo:read",
              advanced: true,
            },
            {
              key: "allowed_environments",
              control: "chips",
              label: { en: "Allowed environments", zh: "允许环境" },
              defaultValue: "production",
              advanced: true,
            },
            {
              key: "adapter_config",
              control: "json",
              label: { en: "Adapter config JSON", zh: "适配器配置 JSON" },
              defaultValue: '{"method":"GET","path":"/repos/{owner}/{repo}/issues"}',
              advanced: true,
            },
            {
              key: "approval_rules",
              control: "json",
              label: { en: "Policy rules JSON", zh: "策略规则 JSON" },
              defaultValue: "[]",
              advanced: true,
            },
          ],
        },
      ],
      serialize(values) {
        return {
          name: String(values.name ?? "github.repo.sync"),
          secret_id: String(values.secret_id ?? ""),
          allowed_mode: String(values.allowed_mode ?? "proxy_or_lease"),
          risk_level: String(values.risk_level ?? "medium"),
          lease_ttl_seconds: String(values.lease_ttl_seconds ?? "180"),
          adapter_type: "github",
          required_provider: "github",
          approval_mode: String(values.approval_mode ?? "auto"),
          adapter_config: String(values.adapter_config ?? '{"method":"GET","path":"/repos/{owner}/{repo}/issues"}'),
          approval_rules: String(values.approval_rules ?? "[]"),
          required_provider_scopes: String(values.required_provider_scopes ?? "repo:read"),
          allowed_environments: String(values.allowed_environments ?? "production"),
        };
      },
      validate(values, locale) {
        return validateCapability(this, values, locale);
      },
    },
    {
      resourceKind: "capability",
      variant: "lease_enabled_generic_http",
      title: { en: "Lease-enabled generic HTTP", zh: "允许租约的通用 HTTP 能力" },
      summary: { en: "Generic HTTP contract that starts with lease support enabled.", zh: "默认启用租约能力的通用 HTTP 契约。" },
      sections: [
        {
          id: "basic",
          title: { en: "Basic fields", zh: "基础字段" },
          fields: [
            { key: "name", control: "text", label: { en: "Capability name", zh: "能力名称" }, required: true },
            {
              key: "secret_id",
              control: "select",
              label: { en: "Bound secret", zh: "绑定密钥" },
              options: secretOptions,
              optionsSource: "management_secret_inventory",
              defaultValue: secretOptions[0]?.value ?? "",
              required: true,
            },
            {
              key: "allowed_mode",
              control: "text",
              label: { en: "Allowed mode", zh: "允许模式" },
              defaultValue: "proxy_or_lease",
              readOnly: true,
              required: true,
            },
            {
              key: "risk_level",
              control: "select",
              label: { en: "Risk level", zh: "风险等级" },
              defaultValue: "medium",
              options: [
                { value: "low", label: { en: "Low", zh: "低" } },
                { value: "medium", label: { en: "Medium", zh: "中" } },
                { value: "high", label: { en: "High", zh: "高" } },
              ],
              required: true,
            },
            {
              key: "lease_ttl_seconds",
              control: "number",
              label: { en: "Lease TTL", zh: "租约时长（秒）" },
              defaultValue: "120",
              required: true,
            },
            {
              key: "adapter_type",
              control: "text",
              label: { en: "Adapter type", zh: "适配器类型" },
              defaultValue: "generic_http",
              readOnly: true,
              required: true,
            },
            {
              key: "required_provider",
              control: "text",
              label: { en: "Required provider", zh: "要求的服务提供方" },
              required: true,
            },
            {
              key: "approval_mode",
              control: "select",
              label: { en: "Approval mode", zh: "审批模式" },
              defaultValue: "auto",
              options: [
                { value: "auto", label: { en: "Auto", zh: "自动" } },
                { value: "manual", label: { en: "Manual review", zh: "人工复核" } },
              ],
              required: true,
            },
            {
              key: "adapter_config",
              control: "json",
              label: { en: "Adapter config JSON", zh: "适配器配置 JSON" },
              defaultValue: "{}",
              advanced: true,
            },
            {
              key: "approval_rules",
              control: "json",
              label: { en: "Policy rules JSON", zh: "策略规则 JSON" },
              defaultValue: "[]",
              advanced: true,
            },
            {
              key: "required_provider_scopes",
              control: "chips",
              label: { en: "Required provider scopes", zh: "要求的服务提供方权限" },
              advanced: true,
            },
            {
              key: "allowed_environments",
              control: "chips",
              label: { en: "Allowed environments", zh: "允许环境" },
              advanced: true,
            },
          ],
        },
      ],
      serialize(values) {
        return {
          name: String(values.name ?? ""),
          secret_id: String(values.secret_id ?? ""),
          allowed_mode: "proxy_or_lease",
          risk_level: String(values.risk_level ?? "medium"),
          lease_ttl_seconds: String(values.lease_ttl_seconds ?? "120"),
          adapter_type: "generic_http",
          required_provider: String(values.required_provider ?? ""),
          approval_mode: String(values.approval_mode ?? "auto"),
          adapter_config: String(values.adapter_config ?? "{}"),
          approval_rules: String(values.approval_rules ?? "[]"),
          required_provider_scopes: String(values.required_provider_scopes ?? ""),
          allowed_environments: String(values.allowed_environments ?? ""),
        };
      },
      validate(values, locale) {
        return validateCapability(this, values, locale);
      },
    },
  ];
}

export function getCapabilityContract(
  contracts: IntakeVariantContract[],
  variant: string,
): IntakeVariantContract {
  return contracts.find((contract) => contract.variant === variant)
    ?? contracts.find((contract) => contract.variant === defaultCapabilityVariant)
    ?? contracts[0];
}
