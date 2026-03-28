import assert from "node:assert/strict";
import test from "node:test";

import type { IntakeVariantContract } from "../types";
import {
  getDefaultValues,
  getHydratedValues,
  isFieldVisible,
  localizeCopy,
} from "../utils";

const sampleContract: IntakeVariantContract = {
  resourceKind: "secret",
  variant: "sample",
  title: { en: "Sample", zh: "示例" },
  summary: { en: "Sample summary", zh: "示例摘要" },
  sections: [
    {
      id: "basic",
      title: { en: "Basic", zh: "基础" },
      fields: [
        {
          key: "display_name",
          control: "text",
          label: { en: "Display name", zh: "显示名称" },
          defaultValue: "default secret",
          required: true,
        },
        {
          key: "metadata",
          control: "json",
          label: { en: "Metadata", zh: "元数据" },
          defaultValue: "{}",
        },
        {
          key: "advanced_value",
          control: "text",
          label: { en: "Advanced", zh: "高级" },
          visibleWhen: [{ field: "metadata", equals: "{}" }],
        },
      ],
    },
  ],
  serialize(values) {
    return {
      display_name: String(values.display_name ?? ""),
      metadata: String(values.metadata ?? "{}"),
    };
  },
};

test("getDefaultValues hydrates defaults and leaves optional fields empty", () => {
  assert.deepEqual(getDefaultValues(sampleContract), {
    display_name: "default secret",
    metadata: "{}",
    advanced_value: "",
  });
});

test("isFieldVisible respects equals-based visibility rules", () => {
  const [displayNameField, metadataField, advancedField] = sampleContract.sections[0].fields;

  assert.equal(isFieldVisible(displayNameField, { metadata: "{}" }), true);
  assert.equal(isFieldVisible(metadataField, { metadata: "{}" }), true);
  assert.equal(isFieldVisible(advancedField, { metadata: "{}" }), true);
  assert.equal(isFieldVisible(advancedField, { metadata: '{"owner":"platform"}' }), false);
});

test("localizeCopy returns locale-specific copy", () => {
  assert.equal(localizeCopy({ en: "Save", zh: "保存" }, "en"), "Save");
  assert.equal(localizeCopy({ en: "Save", zh: "保存" }, "zh"), "保存");
});

test("getHydratedValues preserves editable values and resets read-only defaults when switching variants", () => {
  const lockedContract: IntakeVariantContract = {
    resourceKind: "secret",
    variant: "openai_api_token",
    title: { en: "OpenAI", zh: "OpenAI" },
    summary: { en: "Preset", zh: "预设" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic", zh: "基础" },
        fields: [
          {
            key: "display_name",
            control: "text",
            label: { en: "Display name", zh: "显示名称" },
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
            key: "metadata",
            control: "json",
            label: { en: "Metadata", zh: "元数据" },
            defaultValue: "{}",
          },
        ],
      },
    ],
    serialize(values) {
      return {
        display_name: String(values.display_name ?? ""),
        provider: String(values.provider ?? "openai"),
        kind: String(values.kind ?? "api_token"),
        metadata: String(values.metadata ?? "{}"),
      };
    },
  };

  assert.deepEqual(
    getHydratedValues(lockedContract, {
      display_name: "Shared secret",
      provider: "github",
      kind: "refresh_token",
      metadata: '{"owner":"platform"}',
    }),
    {
      display_name: "Shared secret",
      provider: "openai",
      kind: "api_token",
      metadata: '{"owner":"platform"}',
    },
  );
});

test("getHydratedValues drops invalid select values and keeps valid ones", () => {
  const selectContract: IntakeVariantContract = {
    resourceKind: "capability",
    variant: "generic_capability",
    title: { en: "Capability", zh: "能力" },
    summary: { en: "Capability", zh: "能力" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic", zh: "基础" },
        fields: [
          {
            key: "allowed_mode",
            control: "select",
            label: { en: "Allowed mode", zh: "允许模式" },
            defaultValue: "proxy_only",
            options: [
              { value: "proxy_only", label: { en: "Proxy only", zh: "仅代理" } },
              { value: "proxy_or_lease", label: { en: "Proxy or lease", zh: "代理或租约" } },
            ],
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
          },
        ],
      },
    ],
    serialize(values) {
      return {
        allowed_mode: String(values.allowed_mode ?? "proxy_only"),
        risk_level: String(values.risk_level ?? "medium"),
      };
    },
  };

  assert.deepEqual(
    getHydratedValues(selectContract, {
      allowed_mode: "lease_only",
      risk_level: "high",
    }),
    {
      allowed_mode: "proxy_only",
      risk_level: "high",
    },
  );
});

test("getHydratedValues replaces inherited defaults from the previous variant", () => {
  const previousContract: IntakeVariantContract = {
    resourceKind: "task",
    variant: "custom_task",
    title: { en: "Custom", zh: "自定义" },
    summary: { en: "Custom", zh: "自定义" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic", zh: "基础" },
        fields: [
          {
            key: "input",
            control: "json",
            label: { en: "Input", zh: "输入" },
            defaultValue: '{"provider":"qq"}',
          },
        ],
      },
    ],
    serialize(values) {
      return {
        input: String(values.input ?? '{"provider":"qq"}'),
      };
    },
  };

  const nextContract: IntakeVariantContract = {
    resourceKind: "task",
    variant: "prompt_run",
    title: { en: "Prompt run", zh: "Prompt run" },
    summary: { en: "Prompt run", zh: "Prompt run" },
    sections: [
      {
        id: "basic",
        title: { en: "Basic", zh: "基础" },
        fields: [
          {
            key: "input",
            control: "json",
            label: { en: "Input", zh: "输入" },
            defaultValue: '{"provider":"openai"}',
          },
        ],
      },
    ],
    serialize(values) {
      return {
        input: String(values.input ?? '{"provider":"openai"}'),
      };
    },
  };

  assert.deepEqual(
    getHydratedValues(
      nextContract,
      { input: '{"provider":"qq"}' },
      previousContract,
    ),
    {
      input: '{"provider":"openai"}',
    },
  );

  assert.deepEqual(
    getHydratedValues(
      nextContract,
      { input: '{"provider":"github"}' },
      previousContract,
    ),
    {
      input: '{"provider":"github"}',
    },
  );
});
