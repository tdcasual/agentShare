import type { FieldSpec, IntakeVariantContract } from "./types";

export const defaultAgentVariant = "general_agent";

function createAgentContract(
  variant: string,
  title: { en: string; zh: string },
  summary: { en: string; zh: string },
  includeTaskScope: boolean,
  includeCapabilityScope: boolean,
): IntakeVariantContract {
  const fields: FieldSpec[] = [
    { key: "name", control: "text", label: { en: "Name", zh: "名称" }, required: true },
    {
      key: "risk_tier",
      control: "select",
      label: { en: "Risk tier", zh: "风险等级" },
      defaultValue: "medium",
      options: [
        { value: "low", label: { en: "Low", zh: "低" } },
        { value: "medium", label: { en: "Medium", zh: "中" } },
        { value: "high", label: { en: "High", zh: "高" } },
      ],
      required: true,
    },
  ];

  if (includeTaskScope) {
    fields.push({
      key: "allowed_task_types",
      control: "chips",
      label: { en: "Allowed task types", zh: "允许的任务类型" },
    });
  }

  if (includeCapabilityScope) {
    fields.push({
      key: "allowed_capability_ids",
      control: "chips",
      label: { en: "Allowed capability IDs", zh: "允许的能力 ID" },
    });
  }

  return {
    resourceKind: "agent",
    variant,
    title,
    summary,
    sections: [
      {
        id: "basic",
        title: { en: "Basic fields", zh: "基础字段" },
        fields,
      },
    ],
    serialize(values) {
      return {
        name: String(values.name ?? ""),
        risk_tier: String(values.risk_tier ?? "medium"),
        allowed_task_types: includeTaskScope ? String(values.allowed_task_types ?? "") : "",
        allowed_capability_ids: includeCapabilityScope ? String(values.allowed_capability_ids ?? "") : "",
      };
    },
  };
}

export const agentContracts: IntakeVariantContract[] = [
  createAgentContract(
    "general_agent",
    { en: "General agent", zh: "通用 Agent" },
    { en: "Minimal onboarding with name and risk tier only.", zh: "只包含名称与风险等级的最小化注册。" },
    false,
    false,
  ),
  createAgentContract(
    "task_scoped",
    { en: "Task-scoped agent", zh: "任务范围 Agent" },
    { en: "Agent preset with a task-type allowlist.", zh: "带任务类型白名单的 Agent 模板。" },
    true,
    false,
  ),
  createAgentContract(
    "capability_scoped",
    { en: "Capability-scoped agent", zh: "能力范围 Agent" },
    { en: "Agent preset with an allowed capability list.", zh: "带能力白名单的 Agent 模板。" },
    false,
    true,
  ),
  createAgentContract(
    "fully_scoped",
    { en: "Fully scoped agent", zh: "双范围 Agent" },
    { en: "Agent preset with both task and capability restrictions.", zh: "同时限制任务与能力范围的 Agent 模板。" },
    true,
    true,
  ),
];

export function getAgentContract(variant: string): IntakeVariantContract {
  return agentContracts.find((contract) => contract.variant === variant)
    ?? agentContracts.find((contract) => contract.variant === defaultAgentVariant)
    ?? agentContracts[0];
}
