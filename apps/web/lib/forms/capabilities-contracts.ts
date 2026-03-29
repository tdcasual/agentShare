import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { FieldOption, IntakeVariantContract, ValidationErrors } from "./types";
import { serializeContractValues } from "./utils";
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

const CAPABILITY_PAYLOAD_KEYS = [
  "name",
  "secret_id",
  "allowed_mode",
  "risk_level",
  "lease_ttl_seconds",
  "adapter_type",
  "required_provider",
  "approval_mode",
  "adapter_config",
  "approval_rules",
  "required_provider_scopes",
  "allowed_environments",
] as const;

function createCapabilityBehavior(): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(this: IntakeVariantContract, values) {
      return serializeContractValues(this, values, [...CAPABILITY_PAYLOAD_KEYS]);
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateCapability(this, values, locale);
    },
  };
}

const capabilityResource = requireGeneratedCatalogResource("capability");

export const defaultCapabilityVariant = capabilityResource.default_variant;

const capabilityBehaviors = Object.fromEntries(
  capabilityResource.variants.map((variant) => [variant.variant, createCapabilityBehavior()]),
) as Record<string, Pick<IntakeVariantContract, "serialize" | "validate">>;

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
