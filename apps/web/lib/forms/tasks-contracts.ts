import type { Locale } from "../i18n-shared";

import type { IntakeVariantContract, ValidationErrors } from "./types";
import { mergeValidationErrors, validateJsonField, validateRequiredFields } from "./validators";

export const defaultTaskVariant = "custom_task";

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

function createTaskContract(
  variant: string,
  title: { en: string; zh: string },
  summary: { en: string; zh: string },
  defaultTaskType: string,
  defaultInput: string,
  readOnlyTaskType = false,
): IntakeVariantContract {
  return {
    resourceKind: "task",
    variant,
    title,
    summary,
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields: [
          {
            key: "title",
            control: "text",
            label: { en: "Title", zh: "标题" },
            required: true,
          },
          {
            key: "task_type",
            control: "text",
            label: { en: "Task type", zh: "任务类型" },
            defaultValue: defaultTaskType,
            readOnly: readOnlyTaskType,
            required: true,
          },
          {
            key: "lease_allowed",
            control: "select",
            label: { en: "Lease policy", zh: "租约策略" },
            defaultValue: "false",
            options: [
              { value: "false", label: { en: "Proxy only", zh: "仅代理" } },
              { value: "true", label: { en: "Lease allowed", zh: "允许租约" } },
            ],
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
            key: "input",
            control: "json",
            label: { en: "Input", zh: "输入" },
            defaultValue: defaultInput,
            required: true,
          },
          {
            key: "approval_rules",
            control: "json",
            label: { en: "Policy rules JSON", zh: "策略规则 JSON" },
            defaultValue: "[]",
            advanced: true,
          },
          {
            key: "playbook_ids",
            control: "chips",
            label: { en: "Referenced playbooks", zh: "关联手册" },
            advanced: true,
          },
        ],
      },
    ],
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
    validate(values, locale) {
      return validateTask(this, values, locale);
    },
  };
}

export const taskContracts: IntakeVariantContract[] = [
  createTaskContract(
    "custom_task",
    { en: "Custom task", zh: "自定义任务" },
    { en: "Free-form task intake with full control over task type.", zh: "自由录入，完整控制任务类型。" },
    "",
    '{"provider":"qq"}',
  ),
  createTaskContract(
    "prompt_run",
    { en: "Prompt run", zh: "Prompt run" },
    { en: "Preset for prompt-oriented execution tasks.", zh: "面向 prompt 执行任务的预设模板。" },
    "prompt_run",
    '{"provider":"openai"}',
    true,
  ),
  createTaskContract(
    "config_sync",
    { en: "Config sync", zh: "配置同步" },
    { en: "Preset for synchronizing provider or environment configuration.", zh: "面向配置同步任务的预设模板。" },
    "config_sync",
    '{"provider":"github"}',
    true,
  ),
  createTaskContract(
    "account_read",
    { en: "Account read", zh: "账号读取" },
    { en: "Preset for read-only account inspection or reporting tasks.", zh: "面向只读账号检查与报表的预设模板。" },
    "account_read",
    '{"provider":"github"}',
    true,
  ),
];

export function getTaskContract(variant: string): IntakeVariantContract {
  return taskContracts.find((contract) => contract.variant === variant)
    ?? taskContracts.find((contract) => contract.variant === defaultTaskVariant)
    ?? taskContracts[0];
}
