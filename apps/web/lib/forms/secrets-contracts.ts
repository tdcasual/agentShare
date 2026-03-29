import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract, ValidationErrors } from "./types";
import { serializeContractValues } from "./utils";
import { mergeValidationErrors, validateJsonField, validateRequiredFields } from "./validators";

function validateSecret(
  contract: IntakeVariantContract,
  values: Record<string, string | boolean>,
  locale: Locale,
): ValidationErrors {
  const errors = validateRequiredFields(contract, values, locale);
  const metadataError = validateJsonField(
    String(values.metadata ?? "{}"),
    locale === "zh" ? "元数据" : "Metadata",
    locale,
    "object",
  );
  if (metadataError) {
    errors.metadata = metadataError;
  }
  return mergeValidationErrors(errors);
}

const SECRET_PAYLOAD_KEYS = [
  "display_name",
  "kind",
  "value",
  "provider",
  "environment",
  "provider_scopes",
  "resource_selector",
  "metadata",
] as const;

function createSecretBehavior(): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(this: IntakeVariantContract, values) {
      return serializeContractValues(this, values, [...SECRET_PAYLOAD_KEYS]);
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateSecret(this, values, locale);
    },
  };
}

const secretResource = requireGeneratedCatalogResource("secret");

export const defaultSecretVariant = secretResource.default_variant;

const secretBehaviors = Object.fromEntries(
  secretResource.variants.map((variant) => [variant.variant, createSecretBehavior()]),
) as Record<string, Pick<IntakeVariantContract, "serialize" | "validate">>;

export const secretContracts: IntakeVariantContract[] = adaptResourceCatalog(
  secretResource,
  createVariantBehaviorMap("secret", secretBehaviors),
).contracts;

export function getSecretContract(variant: string): IntakeVariantContract {
  return secretContracts.find((contract) => contract.variant === variant)
    ?? secretContracts.find((contract) => contract.variant === defaultSecretVariant)
    ?? secretContracts[0];
}
