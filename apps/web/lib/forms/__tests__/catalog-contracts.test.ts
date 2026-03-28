import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentContractsFromCatalog,
  buildCapabilityContractsFromCatalog,
  buildSecretContractsFromCatalog,
  buildTaskContractsFromCatalog,
} from "../catalog-contracts";
import type { IntakeCatalogResponse } from "../catalog-types";

const catalog: IntakeCatalogResponse = {
  resource_kinds: [
    {
      kind: "secret",
      default_variant: "openai_api_token",
      variants: [
        {
          resource_kind: "secret",
          variant: "openai_api_token",
          title: { en: "Backend OpenAI token", zh: "后端 OpenAI token" },
          summary: { en: "Backend summary", zh: "后端摘要" },
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
                  key: "value",
                  control: "password",
                  label: { en: "Secret value", zh: "密钥内容" },
                  required: true,
                },
                {
                  key: "provider",
                  control: "text",
                  label: { en: "Provider", zh: "服务提供方" },
                  default_value: "openai",
                  read_only: true,
                  required: true,
                },
                {
                  key: "kind",
                  control: "text",
                  label: { en: "Kind", zh: "类型" },
                  default_value: "api_token",
                  read_only: true,
                  required: true,
                },
                {
                  key: "environment",
                  control: "text",
                  label: { en: "Environment", zh: "环境" },
                },
                {
                  key: "provider_scopes",
                  control: "chips",
                  label: { en: "Provider scopes", zh: "权限范围" },
                  default_value: "responses.read",
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
                  default_value: "{}",
                  advanced: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: "capability",
      default_variant: "generic_capability",
      variants: [
        {
          resource_kind: "capability",
          variant: "generic_capability",
          title: { en: "Backend capability", zh: "后端能力" },
          summary: { en: "Backend capability summary", zh: "后端能力摘要" },
          sections: [
            {
              id: "basic",
              title: { en: "Basic", zh: "基础" },
              fields: [
                {
                  key: "name",
                  control: "text",
                  label: { en: "Capability name", zh: "能力名称" },
                  required: true,
                },
                {
                  key: "secret_id",
                  control: "select",
                  label: { en: "Bound secret", zh: "绑定密钥" },
                  required: true,
                  options_source: "management_secret_inventory",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: "task",
      default_variant: "prompt_run",
      variants: [
        {
          resource_kind: "task",
          variant: "prompt_run",
          title: { en: "Backend prompt run", zh: "后端 Prompt run" },
          summary: { en: "Backend task summary", zh: "后端任务摘要" },
          sections: [
            {
              id: "basic",
              title: { en: "Basic", zh: "基础" },
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
                  required: true,
                  default_value: "prompt_run",
                  read_only: true,
                },
                {
                  key: "lease_allowed",
                  control: "select",
                  label: { en: "Lease policy", zh: "租约策略" },
                  required: true,
                  default_value: "false",
                },
                {
                  key: "approval_mode",
                  control: "select",
                  label: { en: "Approval mode", zh: "审批模式" },
                  required: true,
                  default_value: "auto",
                },
                {
                  key: "input",
                  control: "json",
                  label: { en: "Input", zh: "输入" },
                  required: true,
                  default_value: "{\"provider\":\"openai\"}",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: "agent",
      default_variant: "fully_scoped",
      variants: [
        {
          resource_kind: "agent",
          variant: "fully_scoped",
          title: { en: "Backend fully scoped agent", zh: "后端双范围 Agent" },
          summary: { en: "Backend agent summary", zh: "后端 Agent 摘要" },
          sections: [
            {
              id: "basic",
              title: { en: "Basic", zh: "基础" },
              fields: [
                {
                  key: "name",
                  control: "text",
                  label: { en: "Name", zh: "名称" },
                  required: true,
                },
                {
                  key: "risk_tier",
                  control: "select",
                  label: { en: "Risk tier", zh: "风险等级" },
                  required: true,
                  default_value: "medium",
                },
                {
                  key: "allowed_task_types",
                  control: "chips",
                  label: { en: "Allowed task types", zh: "允许的任务类型" },
                },
                {
                  key: "allowed_capability_ids",
                  control: "chips",
                  label: { en: "Allowed capability IDs", zh: "允许的能力 ID" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test("buildSecretContractsFromCatalog uses backend metadata and existing serializer behavior", () => {
  const resource = buildSecretContractsFromCatalog(catalog);

  assert.equal(resource.defaultVariant, "openai_api_token");
  assert.equal(resource.contracts[0]?.title.en, "Backend OpenAI token");

  const payload = resource.contracts[0]?.serialize({
    display_name: "OpenAI prod key",
    value: "sk-live",
    environment: "production",
    provider_scopes: "responses.read",
    resource_selector: "org:core",
    metadata: "{}",
  });

  assert.equal(payload?.provider, "openai");
  assert.equal(payload?.kind, "api_token");
});

test("buildCapabilityContractsFromCatalog injects secret inventory into backend-driven field definitions", () => {
  const resource = buildCapabilityContractsFromCatalog(catalog, [
    { id: "secret-1", display_name: "OpenAI prod", kind: "api_token" },
  ]);

  assert.equal(resource.contracts[0]?.title.en, "Backend capability");
  assert.deepEqual(resource.contracts[0]?.sections[0]?.fields[1]?.options, [
    {
      value: "secret-1",
      label: { en: "OpenAI prod", zh: "OpenAI prod" },
    },
  ]);
  assert.equal(resource.contracts[0]?.sections[0]?.fields[1]?.optionsSource, "management_secret_inventory");
});

test("buildTaskContractsFromCatalog and buildAgentContractsFromCatalog keep backend defaults", () => {
  const tasks = buildTaskContractsFromCatalog(catalog);
  const agents = buildAgentContractsFromCatalog(catalog);

  assert.equal(tasks.defaultVariant, "prompt_run");
  assert.equal(tasks.contracts[0]?.title.en, "Backend prompt run");
  assert.equal(tasks.contracts[0]?.serialize({ title: "Task title" }).task_type, "prompt_run");

  assert.equal(agents.defaultVariant, "fully_scoped");
  assert.equal(agents.contracts[0]?.title.en, "Backend fully scoped agent");
  assert.equal(agents.contracts[0]?.serialize({ name: "agent" }).allowed_task_types, "");
});
