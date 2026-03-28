import type { Locale } from "../i18n-shared";

import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract, ValidationErrors } from "./types";
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

function createTaskBehavior(
  defaultTaskType: string,
  defaultInput: string,
): Pick<IntakeVariantContract, "serialize" | "validate"> {
  return {
    serialize(values) {
      return {
        title: String(values.title ?? ""),
        task_type: String(values.task_type ?? defaultTaskType),
        lease_allowed: String(values.lease_allowed ?? "false"),
        approval_mode: String(values.approval_mode ?? "auto"),
        input: String(values.input ?? defaultInput),
        approval_rules: String(values.approval_rules ?? "[]"),
        playbook_ids: String(values.playbook_ids ?? ""),
      };
    },
    validate(this: IntakeVariantContract, values, locale) {
      return validateTask(this, values, locale);
    },
  };
}

const taskResource = requireGeneratedCatalogResource("task");

export const defaultTaskVariant = taskResource.default_variant;

const taskBehaviors: Record<string, Pick<IntakeVariantContract, "serialize" | "validate">> = {
  custom_task: createTaskBehavior("", '{"provider":"qq"}'),
  prompt_run: createTaskBehavior("prompt_run", '{"provider":"openai"}'),
  config_sync: createTaskBehavior("config_sync", '{"provider":"github"}'),
  account_read: createTaskBehavior("account_read", '{"provider":"github"}'),
};

export const taskContracts: IntakeVariantContract[] = adaptResourceCatalog(
  taskResource,
  createVariantBehaviorMap("task", taskBehaviors),
).contracts;

export function getTaskContract(variant: string): IntakeVariantContract {
  return taskContracts.find((contract) => contract.variant === variant)
    ?? taskContracts.find((contract) => contract.variant === defaultTaskVariant)
    ?? taskContracts[0];
}
