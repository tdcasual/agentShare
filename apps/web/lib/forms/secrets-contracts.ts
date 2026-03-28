import type { Locale } from "../i18n-shared";

import type { IntakeVariantContract, ValidationErrors } from "./types";
import { mergeValidationErrors, validateJsonField, validateRequiredFields } from "./validators";

export const defaultSecretVariant = "generic_secret";

function validateSecret(
  contract: IntakeVariantContract,
  values: Record<string, string | boolean>,
  locale: Locale,
): ValidationErrors {
  const errors = validateRequiredFields(contract, values, locale);
  const metadataError = validateJsonField(String(values.metadata ?? "{}"), locale === "zh" ? "元数据" : "Metadata", locale, "object");
  if (metadataError) {
    errors.metadata = metadataError;
  }
  return mergeValidationErrors(errors);
}

export const secretContracts: IntakeVariantContract[] = [
  {
    resourceKind: "secret",
    variant: "generic_secret",
    title: { en: "Generic secret", zh: "通用密钥" },
    summary: { en: "Manual entry with full control over kind and provider.", zh: "手动录入，完整控制类型与提供方。" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
            placeholder: { en: "OpenAI production key", zh: "OpenAI 生产访问密钥" },
            required: true,
          },
          {
            key: "kind",
            control: "select",
            label: { en: "Kind", zh: "类型" },
            defaultValue: "api_token",
            options: [
              { value: "api_token", label: { en: "API token", zh: "API token" } },
              { value: "cookie", label: { en: "Cookie", zh: "Cookie" } },
              { value: "refresh_token", label: { en: "Refresh token", zh: "刷新 token" } },
            ],
            required: true,
          },
          {
            key: "value",
            control: "password",
            label: { en: "Secret value", zh: "密钥内容" },
            placeholder: { en: "Paste the secret here", zh: "在这里粘贴密钥" },
            required: true,
          },
          {
            key: "provider",
            control: "text",
            label: { en: "Provider", zh: "服务提供方" },
            placeholder: { en: "openai", zh: "openai" },
            required: true,
          },
          {
            key: "environment",
            control: "text",
            label: { en: "Environment", zh: "环境" },
            placeholder: { en: "production", zh: "production" },
          },
          {
            key: "provider_scopes",
            control: "chips",
            label: { en: "Provider scopes", zh: "权限范围" },
            placeholder: { en: "responses.read,responses.write", zh: "responses.read,responses.write" },
          },
          {
            key: "resource_selector",
            control: "text",
            label: { en: "Resource selector", zh: "资源选择器" },
            placeholder: { en: "org:core", zh: "org:core" },
          },
          {
            key: "metadata",
            control: "json",
            label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
            defaultValue: '{"owner":"platform"}',
            advanced: true,
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: String(values.kind ?? "api_token"),
        value: String(values.value ?? ""),
        provider: String(values.provider ?? ""),
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? ""),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(values, locale) {
      return validateSecret(this, values, locale);
    },
  },
  {
    resourceKind: "secret",
    variant: "openai_api_token",
    title: { en: "OpenAI API token", zh: "OpenAI API token" },
    summary: { en: "Preset for OpenAI token intake with guided scopes.", zh: "为 OpenAI token 提供带默认范围的录入模板。" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
            placeholder: { en: "OpenAI production key", zh: "OpenAI 生产访问密钥" },
            required: true,
          },
          {
            key: "value",
            control: "password",
            label: { en: "Secret value", zh: "密钥内容" },
            placeholder: { en: "Paste the secret here", zh: "在这里粘贴密钥" },
            required: true,
          },
          {
            key: "provider",
            control: "text",
            label: { en: "Provider", zh: "服务提供方" },
            defaultValue: "openai",
            readOnly: true,
            required: true,
          },
          {
            key: "kind",
            control: "text",
            label: { en: "Kind", zh: "类型" },
            defaultValue: "api_token",
            readOnly: true,
            required: true,
          },
          {
            key: "environment",
            control: "text",
            label: { en: "Environment", zh: "环境" },
            placeholder: { en: "production", zh: "production" },
          },
          {
            key: "provider_scopes",
            control: "chips",
            label: { en: "Provider scopes", zh: "权限范围" },
            defaultValue: "responses.read,responses.write",
          },
          {
            key: "resource_selector",
            control: "text",
            label: { en: "Resource selector", zh: "资源选择器" },
            placeholder: { en: "org:core", zh: "org:core" },
          },
          {
            key: "metadata",
            control: "json",
            label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
            defaultValue: '{"owner":"platform"}',
            advanced: true,
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: "api_token",
        value: String(values.value ?? ""),
        provider: "openai",
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? "responses.read,responses.write"),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(values, locale) {
      return validateSecret(this, values, locale);
    },
  },
  {
    resourceKind: "secret",
    variant: "github_pat",
    title: { en: "GitHub PAT", zh: "GitHub PAT" },
    summary: { en: "Preset for GitHub personal access tokens.", zh: "为 GitHub 个人访问 token 提供模板。" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
            placeholder: { en: "GitHub repo automation token", zh: "GitHub 仓库自动化 token" },
            required: true,
          },
          {
            key: "value",
            control: "password",
            label: { en: "Secret value", zh: "密钥内容" },
            placeholder: { en: "Paste the secret here", zh: "在这里粘贴密钥" },
            required: true,
          },
          {
            key: "provider",
            control: "text",
            label: { en: "Provider", zh: "服务提供方" },
            defaultValue: "github",
            readOnly: true,
            required: true,
          },
          {
            key: "kind",
            control: "text",
            label: { en: "Kind", zh: "类型" },
            defaultValue: "api_token",
            readOnly: true,
            required: true,
          },
          {
            key: "environment",
            control: "text",
            label: { en: "Environment", zh: "环境" },
            placeholder: { en: "production", zh: "production" },
          },
          {
            key: "provider_scopes",
            control: "chips",
            label: { en: "Provider scopes", zh: "权限范围" },
            defaultValue: "repo:read",
          },
          {
            key: "resource_selector",
            control: "text",
            label: { en: "Resource selector", zh: "资源选择器" },
            placeholder: { en: "repo:agent-share", zh: "repo:agent-share" },
          },
          {
            key: "metadata",
            control: "json",
            label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
            defaultValue: '{"owner":"platform"}',
            advanced: true,
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: "api_token",
        value: String(values.value ?? ""),
        provider: "github",
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? "repo:read"),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(values, locale) {
      return validateSecret(this, values, locale);
    },
  },
  {
    resourceKind: "secret",
    variant: "cookie_session",
    title: { en: "Cookie session", zh: "Cookie 会话" },
    summary: { en: "Store a cookie-based session secret with provider metadata.", zh: "存储基于 Cookie 的会话凭据与提供方元信息。" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
            required: true,
          },
          {
            key: "value",
            control: "password",
            label: { en: "Secret value", zh: "密钥内容" },
            required: true,
          },
          {
            key: "provider",
            control: "text",
            label: { en: "Provider", zh: "服务提供方" },
            required: true,
          },
          {
            key: "kind",
            control: "text",
            label: { en: "Kind", zh: "类型" },
            defaultValue: "cookie",
            readOnly: true,
            required: true,
          },
          {
            key: "environment",
            control: "text",
            label: { en: "Environment", zh: "环境" },
          },
          {
            key: "resource_selector",
            control: "text",
            label: { en: "Resource selector", zh: "资源选择器" },
          },
          {
            key: "metadata",
            control: "json",
            label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
            defaultValue: '{"owner":"platform"}',
            advanced: true,
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: "cookie",
        value: String(values.value ?? ""),
        provider: String(values.provider ?? ""),
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? ""),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(values, locale) {
      return validateSecret(this, values, locale);
    },
  },
  {
    resourceKind: "secret",
    variant: "refresh_token",
    title: { en: "Refresh token", zh: "刷新 token" },
    summary: { en: "Store a refresh token with provider and environment metadata.", zh: "存储带提供方与环境信息的刷新 token。" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
            required: true,
          },
          {
            key: "value",
            control: "password",
            label: { en: "Secret value", zh: "密钥内容" },
            required: true,
          },
          {
            key: "provider",
            control: "text",
            label: { en: "Provider", zh: "服务提供方" },
            required: true,
          },
          {
            key: "kind",
            control: "text",
            label: { en: "Kind", zh: "类型" },
            defaultValue: "refresh_token",
            readOnly: true,
            required: true,
          },
          {
            key: "environment",
            control: "text",
            label: { en: "Environment", zh: "环境" },
          },
          {
            key: "resource_selector",
            control: "text",
            label: { en: "Resource selector", zh: "资源选择器" },
          },
          {
            key: "metadata",
            control: "json",
            label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
            defaultValue: '{"owner":"platform"}',
            advanced: true,
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: "refresh_token",
        value: String(values.value ?? ""),
        provider: String(values.provider ?? ""),
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? ""),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(values, locale) {
      return validateSecret(this, values, locale);
    },
  },
];

export function getSecretContract(variant: string): IntakeVariantContract {
  return secretContracts.find((contract) => contract.variant === variant)
    ?? secretContracts.find((contract) => contract.variant === defaultSecretVariant)
    ?? secretContracts[0];
}
