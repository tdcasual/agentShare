import assert from "node:assert/strict";
import test from "node:test";

import { agentContracts, defaultAgentVariant, getAgentContract } from "../agents-contracts";
import {
  buildCapabilityContracts,
  defaultCapabilityVariant,
} from "../capabilities-contracts";
import { getFrontendContractSummary } from "../contract-summary";
import {
  defaultSecretVariant,
  getSecretContract,
  secretContracts,
} from "../secrets-contracts";
import { defaultTaskVariant, getTaskContract, taskContracts } from "../tasks-contracts";

test("secret registry exposes a stable default variant", () => {
  assert.ok(secretContracts.some((contract) => contract.variant === defaultSecretVariant));

  const contract = getSecretContract("openai_api_token");
  const payload = contract.serialize({
    display_name: "OpenAI prod key",
    value: "sk-live",
    environment: "production",
    provider_scopes: "responses.read,responses.write",
    resource_selector: "org:core",
    metadata: '{"owner":"platform"}',
  });

  assert.equal(payload.kind, "api_token");
  assert.equal(payload.provider, "openai");
  assert.equal(payload.value, "sk-live");
});

test("task registry supports guided variants plus a custom fallback", () => {
  assert.ok(taskContracts.some((contract) => contract.variant === defaultTaskVariant));

  const promptRun = getTaskContract("prompt_run");
  const payload = promptRun.serialize({
    title: "Prompt run task",
    input: '{"provider":"openai"}',
    lease_allowed: "false",
    approval_mode: "auto",
    approval_rules: "[]",
    playbook_ids: "",
  });

  assert.equal(payload.task_type, "prompt_run");
  assert.equal(payload.approval_mode, "auto");
});

test("capability registry can be built from current secret inventory", () => {
  const capabilityContracts = buildCapabilityContracts([
    { id: "secret-1", display_name: "OpenAI prod", kind: "api_token" },
  ]);

  assert.ok(capabilityContracts.some((contract) => contract.variant === defaultCapabilityVariant));

  const openai = capabilityContracts.find((contract) => contract.variant === "openai_chat_proxy");
  assert.ok(openai);
  const secretField = openai.sections[0]?.fields.find((field) => field.key === "secret_id");

  const payload = openai.serialize({
    name: "openai.chat.invoke",
    secret_id: "secret-1",
    allowed_mode: "proxy_only",
    risk_level: "medium",
    lease_ttl_seconds: "60",
    approval_mode: "auto",
    approval_rules: "[]",
    adapter_config: "{}",
    required_provider_scopes: "responses.read",
    allowed_environments: "production",
  });

  assert.equal(payload.adapter_type, "openai");
  assert.equal(payload.required_provider, "openai");
  assert.equal(secretField?.defaultValue, "secret-1");
});

test("agent registry exposes scoped onboarding variants", () => {
  assert.ok(agentContracts.length >= 3);

  const scoped = getAgentContract("task_scoped");
  const payload = scoped.serialize({
    name: "scoped-agent",
    risk_tier: "medium",
    allowed_task_types: "prompt_run,account_read",
    allowed_capability_ids: "",
  });

  assert.equal(payload.name, "scoped-agent");
  assert.equal(payload.allowed_task_types, "prompt_run,account_read");
  assert.equal(payload.allowed_capability_ids, "");
});

test("frontend contract summary exposes stable defaults and dynamic option sources", () => {
  const summary = getFrontendContractSummary();

  assert.equal(summary.secret.default_variant, defaultSecretVariant);
  assert.equal(summary.task.default_variant, defaultTaskVariant);
  assert.equal(summary.capability.default_variant, defaultCapabilityVariant);
  assert.equal(summary.agent.default_variant, defaultAgentVariant);

  const capabilitySecretField = summary.capability.variants.generic_capability.sections[0]?.fields.find(
    (field) => field.key === "secret_id",
  );
  assert.equal(capabilitySecretField?.options_source, "management_secret_inventory");

  const openaiProviderField = summary.secret.variants.openai_api_token.sections[0]?.fields.find(
    (field) => field.key === "provider",
  );
  assert.equal(openaiProviderField?.read_only, true);
});
