import assert from "node:assert/strict";
import test from "node:test";

import { agentContracts, getAgentContract } from "../agents-contracts";
import {
  buildCapabilityContracts,
  defaultCapabilityVariant,
} from "../capabilities-contracts";
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
