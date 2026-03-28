import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
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

function createCapabilityBehavior(config: {
  defaultName?: string;
  defaultAllowedMode?: string;
  fixedAllowedMode?: string;
  defaultRiskLevel?: string;
  defaultLeaseTtlSeconds?: string;
  defaultAdapterType?: string;
  fixedAdapterType?: string;
  defaultRequiredProvider?: string;
  fixedRequiredProvider?: string;
  defaultApprovalMode?: string;
  defaultAdapterConfig?: string;
  defaultApprovalRules?: string;
  defaultRequiredProviderScopes?: string;
  defaultAllowedEnvironments?: string;
}): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(values) {
      return {
        name: String(values.name ?? config.defaultName ?? ""),
        secret_id: String(values.secret_id ?? ""),
        allowed_mode: config.fixedAllowedMode ?? String(values.allowed_mode ?? config.defaultAllowedMode ?? "proxy_only"),
        risk_level: String(values.risk_level ?? config.defaultRiskLevel ?? "medium"),
        lease_ttl_seconds: String(values.lease_ttl_seconds ?? config.defaultLeaseTtlSeconds ?? "60"),
        adapter_type: config.fixedAdapterType ?? String(values.adapter_type ?? config.defaultAdapterType ?? "generic_http"),
        required_provider: config.fixedRequiredProvider ?? String(values.required_provider ?? config.defaultRequiredProvider ?? ""),
        approval_mode: String(values.approval_mode ?? config.defaultApprovalMode ?? "auto"),
        adapter_config: String(values.adapter_config ?? config.defaultAdapterConfig ?? "{}"),
        approval_rules: String(values.approval_rules ?? config.defaultApprovalRules ?? "[]"),
        required_provider_scopes: String(values.required_provider_scopes ?? config.defaultRequiredProviderScopes ?? ""),
        allowed_environments: String(values.allowed_environments ?? config.defaultAllowedEnvironments ?? ""),
      };
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateCapability(this, values, locale);
    },
  };
}

const capabilityResource = requireGeneratedCatalogResource("capability");

export const defaultCapabilityVariant = capabilityResource.default_variant;

const capabilityBehaviors: Record<string, Pick<IntakeVariantContract, "serialize" | "validate">> = {
  generic_capability: createCapabilityBehavior({
    defaultAllowedMode: "proxy_only",
    defaultRiskLevel: "medium",
    defaultLeaseTtlSeconds: "60",
    defaultAdapterType: "generic_http",
    defaultApprovalMode: "auto",
    defaultAdapterConfig: "{}",
    defaultApprovalRules: "[]",
  }),
  openai_chat_proxy: createCapabilityBehavior({
    defaultName: "openai.chat.invoke",
    defaultAllowedMode: "proxy_only",
    defaultRiskLevel: "medium",
    defaultLeaseTtlSeconds: "60",
    fixedAdapterType: "openai",
    fixedRequiredProvider: "openai",
    defaultApprovalMode: "auto",
    defaultAdapterConfig: "{}",
    defaultApprovalRules: "[]",
    defaultRequiredProviderScopes: "responses.read",
    defaultAllowedEnvironments: "production",
  }),
  github_rest_proxy: createCapabilityBehavior({
    defaultName: "github.repo.sync",
    defaultAllowedMode: "proxy_or_lease",
    defaultRiskLevel: "medium",
    defaultLeaseTtlSeconds: "180",
    fixedAdapterType: "github",
    fixedRequiredProvider: "github",
    defaultApprovalMode: "auto",
    defaultAdapterConfig: '{"method":"GET","path":"/repos/{owner}/{repo}/issues"}',
    defaultApprovalRules: "[]",
    defaultRequiredProviderScopes: "repo:read",
    defaultAllowedEnvironments: "production",
  }),
  lease_enabled_generic_http: createCapabilityBehavior({
    fixedAllowedMode: "proxy_or_lease",
    defaultRiskLevel: "medium",
    defaultLeaseTtlSeconds: "120",
    fixedAdapterType: "generic_http",
    defaultApprovalMode: "auto",
    defaultAdapterConfig: "{}",
    defaultApprovalRules: "[]",
  }),
};

export function buildCapabilityContracts(secrets: SecretBindingOption[]): IntakeVariantContract[] {
  return adaptResourceCatalog(
    capabilityResource,
    createVariantBehaviorMap("capability", capabilityBehaviors),
    {
      management_secret_inventory: toSecretOptions(secrets),
    },
  ).contracts;
}

export function getCapabilityContract(
  contracts: IntakeVariantContract[],
  variant: string,
): IntakeVariantContract {
  return contracts.find((contract) => contract.variant === variant)
    ?? contracts.find((contract) => contract.variant === defaultCapabilityVariant)
    ?? contracts[0];
}
