import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract, ValidationErrors } from "./types";
import { serializeContractValues } from "./utils";
import { mergeValidationErrors, validateJsonField, validateRequiredFields } from "./validators";

function validateTask(
  contract: IntakeVariantContract,
  values: Record<string, string | boolean>,
  locale: Locale,
): ValidationErrors {
  const errors = validateRequiredFields(contract, values, locale);
  const inputError = validateJsonField(
    String(values.input ?? "{}"),
    locale === "zh" ? "输入" : "Input",
    locale,
    "object",
  );
  const approvalRulesError = validateJsonField(
    String(values.approval_rules ?? "[]"),
    locale === "zh" ? "策略规则 JSON" : "Policy rules JSON",
    locale,
    "array",
  );

  if (inputError) {
    errors.input = inputError;
  }
  if (approvalRulesError) {
    errors.approval_rules = approvalRulesError;
  }

  return mergeValidationErrors(errors);
}

const TASK_PAYLOAD_KEYS = [
  "title",
  "task_type",
  "lease_allowed",
  "approval_mode",
  "input",
  "approval_rules",
  "playbook_ids",
] as const;

function createTaskBehavior(): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(this: IntakeVariantContract, values) {
      return serializeContractValues(this, values, [...TASK_PAYLOAD_KEYS]);
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateTask(this, values, locale);
    },
  };
}

const taskResource = requireGeneratedCatalogResource("task");

export const defaultTaskVariant = taskResource.default_variant;

const taskBehaviors = Object.fromEntries(
  taskResource.variants.map((variant) => [variant.variant, createTaskBehavior()]),
) as Record<string, Pick<IntakeVariantContract, "serialize" | "validate">>;

export const taskContracts: IntakeVariantContract[] = adaptResourceCatalog(
  taskResource,
  createVariantBehaviorMap("task", taskBehaviors),
).contracts;

export function getTaskContract(variant: string): IntakeVariantContract {
  return taskContracts.find((contract) => contract.variant === variant)
    ?? taskContracts.find((contract) => contract.variant === defaultTaskVariant)
    ?? taskContracts[0];
}
