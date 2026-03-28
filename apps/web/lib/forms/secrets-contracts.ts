import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract, ValidationErrors } from "./types";
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

function createSecretBehavior(config: {
  defaultKind?: string;
  fixedKind?: string;
  defaultProvider?: string;
  fixedProvider?: string;
  defaultProviderScopes?: string;
}): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        kind: config.fixedKind ?? String(values.kind ?? config.defaultKind ?? ""),
        value: String(values.value ?? ""),
        provider: config.fixedProvider ?? String(values.provider ?? config.defaultProvider ?? ""),
        environment: String(values.environment ?? ""),
        provider_scopes: String(values.provider_scopes ?? config.defaultProviderScopes ?? ""),
        resource_selector: String(values.resource_selector ?? ""),
        metadata: String(values.metadata ?? "{}"),
      };
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateSecret(this, values, locale);
    },
  };
}

const secretResource = requireGeneratedCatalogResource("secret");

export const defaultSecretVariant = secretResource.default_variant;

const secretBehaviors: Record<string, Pick<IntakeVariantContract, "serialize" | "validate">> = {
  generic_secret: createSecretBehavior({
    defaultKind: "api_token",
  }),
  openai_api_token: createSecretBehavior({
    fixedKind: "api_token",
    fixedProvider: "openai",
    defaultProviderScopes: "responses.read,responses.write",
  }),
  github_pat: createSecretBehavior({
    fixedKind: "api_token",
    fixedProvider: "github",
    defaultProviderScopes: "repo:read",
  }),
  cookie_session: createSecretBehavior({
    fixedKind: "cookie",
  }),
  refresh_token: createSecretBehavior({
    fixedKind: "refresh_token",
  }),
};

export const secretContracts: IntakeVariantContract[] = adaptResourceCatalog(
  secretResource,
  createVariantBehaviorMap("secret", secretBehaviors),
).contracts;

export function getSecretContract(variant: string): IntakeVariantContract {
  return secretContracts.find((contract) => contract.variant === variant)
    ?? secretContracts.find((contract) => contract.variant === defaultSecretVariant)
    ?? secretContracts[0];
}
