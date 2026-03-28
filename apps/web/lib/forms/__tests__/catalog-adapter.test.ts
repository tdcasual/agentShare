import assert from "node:assert/strict";
import test from "node:test";

import { adaptCatalogVariant, adaptResourceCatalog } from "../catalog-adapter";
import type { IntakeCatalogResource, IntakeCatalogVariant } from "../catalog-types";

const openAiSecretVariant: IntakeCatalogVariant = {
  resource_kind: "secret",
  variant: "openai_api_token",
  title: { en: "OpenAI API token", zh: "OpenAI API token" },
  summary: {
    en: "Preset for OpenAI token intake with guided scopes.",
    zh: "为 OpenAI token 提供带默认范围的录入模板。",
  },
  sections: [
    {
      id: "basic",
      title: { en: "Basic fields", zh: "基础字段" },
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
          key: "metadata",
          control: "json",
          label: { en: "Metadata (JSON)", zh: "元数据（JSON）" },
          default_value: "{\"owner\":\"platform\"}",
          advanced: true,
        },
      ],
    },
  ],
};

test("adaptCatalogVariant preserves read-only defaults and advanced metadata", () => {
  const contract = adaptCatalogVariant(openAiSecretVariant);

  assert.equal(contract.variant, "openai_api_token");
  assert.equal(contract.resourceKind, "secret");
  assert.equal(contract.sections[0]?.fields[1]?.defaultValue, "openai");
  assert.equal(contract.sections[0]?.fields[1]?.readOnly, true);
  assert.equal(contract.sections[0]?.fields[2]?.defaultValue, "api_token");
  assert.equal(contract.sections[0]?.fields[3]?.advanced, true);
});

test("adaptResourceCatalog keeps capability secret binding inventory-backed", () => {
  const capabilityCatalog: IntakeCatalogResource = {
    kind: "capability",
    default_variant: "generic_capability",
    variants: [
      {
        resource_kind: "capability",
        variant: "generic_capability",
        title: { en: "Generic capability", zh: "通用能力" },
        summary: {
          en: "Manual binding with full adapter and provider control.",
          zh: "手动绑定，完整控制适配器与提供方。",
        },
        sections: [
          {
            id: "basic",
            title: { en: "Basic fields", zh: "基础字段" },
            fields: [
              {
                key: "secret_id",
                control: "select",
                label: { en: "Bound secret", zh: "绑定密钥" },
                required: true,
                options_source: "management_secret_inventory",
              },
              {
                key: "allowed_mode",
                control: "select",
                label: { en: "Allowed mode", zh: "允许模式" },
                required: true,
                default_value: "proxy_only",
                options: [
                  { value: "proxy_only", label: { en: "Proxy only", zh: "仅代理" } },
                  { value: "proxy_or_lease", label: { en: "Proxy or lease", zh: "代理或租约" } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const resource = adaptResourceCatalog(capabilityCatalog);
  const secretField = resource.contracts[0]?.sections[0]?.fields[0];

  assert.equal(resource.defaultVariant, "generic_capability");
  assert.equal(secretField?.key, "secret_id");
  assert.equal(secretField?.optionsSource, "management_secret_inventory");
  assert.deepEqual(secretField?.options, []);
});

test("adaptResourceCatalog defaults inventory-backed selects to the first available option", () => {
  const capabilityCatalog: IntakeCatalogResource = {
    kind: "capability",
    default_variant: "generic_capability",
    variants: [
      {
        resource_kind: "capability",
        variant: "generic_capability",
        title: { en: "Generic capability", zh: "通用能力" },
        summary: {
          en: "Manual binding with full adapter and provider control.",
          zh: "手动绑定，完整控制适配器与提供方。",
        },
        sections: [
          {
            id: "basic",
            title: { en: "Basic fields", zh: "基础字段" },
            fields: [
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
  };

  const resource = adaptResourceCatalog(capabilityCatalog, {}, {
    management_secret_inventory: [
      {
        value: "secret-1",
        label: { en: "OpenAI prod", zh: "OpenAI prod" },
      },
      {
        value: "secret-2",
        label: { en: "GitHub prod", zh: "GitHub prod" },
      },
    ],
  });
  const secretField = resource.contracts[0]?.sections[0]?.fields[0];

  assert.equal(secretField?.defaultValue, "secret-1");
});
