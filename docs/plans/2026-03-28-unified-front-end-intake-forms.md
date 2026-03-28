# Unified Front-End Intake Forms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the front-end creation flows for secrets, capabilities, tasks, and agents so the console can support multiple intake variants without duplicating form logic or forcing operators to handcraft every payload.

**Architecture:** Keep the existing backend routes and server actions intact, but insert a front-end contract layer between page-level forms and API payload creation. Each resource type gets a small registry of intake variants, each variant declares its fields, defaults, validation rules, and a serializer that maps UI values into the current API contract. A single reusable form renderer handles sections, field controls, conditional visibility, helper text, validation feedback, and variant switching.

**Tech Stack:** Next.js App Router, React server actions, existing `apps/web` CSS system, current i18n helpers, TypeScript discriminated unions, Playwright UI coverage.

---

## Context

Today the console has four separate creation experiences:

- `secrets` uses a fixed form with a small hardcoded `kind` select plus several free-text fields.
- `capabilities` combines secret binding, provider requirements, adapter configuration, risk, lease settings, and approval policy in one hand-authored form.
- `tasks` asks for a free-text `task_type` with no guided templates.
- `agents` uses a tiny inline form and does not expose scoped intake variants beyond name and risk tier.

This is workable for a narrow MVP, but it does not scale well when we need to support:

- more secret intake types such as GitHub PATs, OAuth refresh tokens, cookies, environment-specific tokens, and generic API tokens;
- more capability archetypes such as provider-specific adapters, generic HTTP contracts, and lease-enabled variants;
- more task creation templates tied to common task families;
- more agent onboarding patterns with optional allowlists and preset scopes.

The front-end currently duplicates field layout, defaults, and payload shaping across:

- [SecretsForm](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx)
- [CapabilityForm](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx)
- [TaskForm](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx)
- [AgentsPage](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/agents/page.tsx)
- [actions.ts](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts)

This plan introduces a shared front-end intake model without changing the backend request schema in the first phase.

## Product Decisions

### 1. Unify around resource kinds and intake variants

The UI should distinguish between:

- `resourceKind`: what object we are creating
  - `secret`
  - `capability`
  - `task`
  - `agent`
- `variant`: the operator-friendly template within that resource kind

Examples:

- `secret.openai_api_token`
- `secret.github_pat`
- `secret.generic_api_token`
- `secret.cookie`
- `secret.refresh_token`
- `capability.openai_chat_proxy`
- `capability.github_rest_proxy`
- `capability.generic_http`
- `task.prompt_run`
- `task.config_sync`
- `task.account_read`
- `task.custom`
- `agent.general`
- `agent.task_scoped`
- `agent.capability_scoped`

Every intake screen should start with a variant selector. Once the user chooses a variant, the form updates to show the right fields, defaults, descriptions, and advanced options.

### 2. Keep backend contracts unchanged in phase 1

We should not switch to backend-driven JSON Schema in the first rollout.

Phase 1 should preserve:

- `POST /api/secrets`
- `POST /api/capabilities`
- `POST /api/tasks`
- `POST /api/agents`
- current server action entrypoints in [actions.ts](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts)

This keeps the migration low-risk:

- no API negotiation changes;
- no management auth changes;
- no schema synchronization problem between front-end and backend;
- simpler incremental rollout page by page.

The front-end contract layer is responsible for transforming variant-shaped form values into the existing backend payload.

### 3. Preserve an escape hatch

The system should guide operators toward structured variants, but not block uncommon cases.

That means:

- `task.custom` must remain available with a free-text `task_type`;
- `secret.generic_api_token` must remain available for providers without first-class templates;
- `capability.generic_http` must remain available for adapters that are not yet modeled;
- advanced JSON inputs should still exist, but move behind explicit advanced sections and helper copy.

### 4. Prefer variant-specific defaults over generic giant forms

The current capability form asks the operator to fill everything at once. The unified system should instead use smaller, opinionated variants:

- `openai_chat_proxy` preselects `adapter_type=openai`, `allowed_mode=proxy_only`, sensible provider scopes, and a prompt-friendly adapter config starter.
- `github_rest_proxy` preselects `adapter_type=github`, `required_provider=github`, and shows narrower repository/path guidance.
- `prompt_run` task templates prefill `task_type=prompt_run` and relevant input examples.

This keeps the form legible and reduces invalid combinations.

## Proposed Front-End Architecture

### Core data model

Create a shared intake contract model under `apps/web/lib/forms/`.

Recommended files:

- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/types.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/validators.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/utils.ts`

Suggested contract types:

```ts
export type ResourceKind = "secret" | "capability" | "task" | "agent";

export type FieldControl =
  | "text"
  | "password"
  | "textarea"
  | "number"
  | "select"
  | "switch"
  | "json"
  | "chips";

export type FieldSpec = {
  key: string;
  label: { en: string; zh: string };
  description?: { en: string; zh: string };
  control: FieldControl;
  required?: boolean;
  placeholder?: { en: string; zh: string };
  defaultValue?: unknown;
  options?: Array<{
    value: string;
    label: { en: string; zh: string };
  }>;
  advanced?: boolean;
  visibleWhen?: Array<{
    field: string;
    equals: unknown;
  }>;
};

export type FormSection = {
  id: string;
  title: { en: string; zh: string };
  description?: { en: string; zh: string };
  fields: FieldSpec[];
};

export type IntakeVariantContract = {
  resourceKind: ResourceKind;
  variant: string;
  title: { en: string; zh: string };
  summary: { en: string; zh: string };
  sections: FormSection[];
  serialize(values: Record<string, unknown>): Record<string, unknown>;
  validate?(values: Record<string, unknown>): Record<string, string>;
};
```

### Resource-specific contract registries

Create one registry per resource kind:

- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/secrets-contracts.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/capabilities-contracts.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/tasks-contracts.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/agents-contracts.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/index.ts`

Each registry exports:

- `variants`: ordered list for the variant picker
- `defaultVariant`
- `getVariantContract(variant)`

### Shared form renderer

Build one reusable rendering layer:

- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-variant-picker.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/text-field.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/select-field.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/json-field.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/chips-field.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/switch-field.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/index.ts`

Responsibilities:

- render variant picker;
- render sections in a stable order;
- hide or show fields based on `visibleWhen`;
- split “basic” and “advanced” sections consistently;
- maintain a typed local value map;
- serialize values before submit;
- surface validation errors inline before server action submission.

### Submit strategy

Do not replace current server actions immediately.

Instead, each page-level form container should:

- keep using the existing server action for submission;
- build a hidden payload representation from the selected variant;
- map rendered fields to the form names already expected by [actions.ts](/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts).

In phase 1, the simplest path is:

- use a client wrapper component to manage variant state and defaults;
- submit via a standard HTML form with hidden normalized inputs;
- keep server actions unchanged except for optional cleanup helpers.

## Resource-by-Resource Planning

### Secrets

Target variants:

- `openai_api_token`
- `github_pat`
- `generic_api_token`
- `cookie`
- `refresh_token`

Fields should be normalized to the existing secret payload:

- `display_name`
- `kind`
- `value`
- `provider`
- `environment`
- `provider_scopes`
- `resource_selector`
- `metadata`

Variant-specific behavior:

- `openai_api_token`
  - preset `kind=api_token`
  - preset `provider=openai`
  - suggest scopes like `responses.read,responses.write`
- `github_pat`
  - preset `kind=api_token`
  - preset `provider=github`
  - description should encourage repo-scoped tokens
- `cookie`
  - preset `kind=cookie`
  - description should explain narrower session intent
- `refresh_token`
  - preset `kind=refresh_token`
  - metadata helper should prompt for token audience or auth flow notes

### Capabilities

Target variants:

- `openai_chat_proxy`
- `github_rest_proxy`
- `generic_http`
- `lease_enabled_generic_http`

Use variant presets to reduce invalid combinations:

- adapter type
- required provider
- provider scopes
- lease defaults
- approval defaults

Important rule:

Capability intake should consume available secrets as context and filter suggestions based on secret `kind`, `provider`, and environment.

### Tasks

Target variants:

- `prompt_run`
- `config_sync`
- `account_read`
- `custom`

Variant benefits:

- prefill `task_type`
- prefill starter `input` JSON
- show task-specific help text
- expose playbook linking consistently
- preserve `custom` as an escape hatch

### Agents

Target variants:

- `general`
- `task_scoped`
- `capability_scoped`

This page currently exposes only name and risk tier. The unified intake system should optionally expose:

- `allowed_task_types`
- `allowed_capability_ids`

Only the scoped variants should surface those allowlists by default.

## UX Rules

### Variant selection

Each create page should show:

- a short explanation of what the resource does;
- a compact variant selector with 1-line summaries;
- the active form below it;
- a small “need full control?” link to the `custom` or generic variant when applicable.

### Basic vs advanced

Basic fields should remain visible by default.

Advanced fields should include:

- policy JSON
- adapter config JSON
- metadata JSON
- freeform lists such as scopes or environments when they are not variant defaults

Use one consistent advanced disclosure pattern across all creation pages.

### Validation posture

Client-side validation should catch:

- empty required fields;
- malformed JSON;
- impossible numeric ranges like lease TTL `< 1`;
- obviously wrong combinations, such as a GitHub capability bound to an OpenAI provider contract.

Server-side validation remains the final source of truth.

## Incremental Rollout Strategy

### Phase 1: Foundation

Build the shared contract model and renderer without changing any live page behavior.

Deliverables:

- form types
- registry pattern
- field components
- one demo-only usage path or Storybook-like internal harness if needed

### Phase 2: Secrets migration

Migrate secrets first because:

- it has the clearest resource variants;
- it has low coupling to other pages;
- success criteria are easy to validate.

### Phase 3: Capabilities migration

Migrate capabilities next because it benefits most from conditional UI and provider-aware presets.

### Phase 4: Tasks migration

Introduce task templates while preserving free-text custom task types.

### Phase 5: Agents migration

Expand the current small form into scoped variants once the renderer pattern is stable.

## Testing Strategy

### Unit coverage

Add tests for:

- contract serialization
- conditional field visibility
- default values per variant
- validation error generation

Recommended files:

- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/secrets-contracts.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/capabilities-contracts.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/tasks-contracts.test.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/agents-contracts.test.ts`

### Playwright coverage

Extend Playwright to validate:

- variant switching updates visible fields;
- submitting a default variant still reaches the existing success path;
- advanced JSON sections remain usable;
- current management session requirements are unchanged.

Recommended files:

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/secret-to-task.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/approvals.spec.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`

## Risks And Guardrails

### Risk: hidden payload drift

If variant serializers drift from backend expectations, forms may look correct while submissions fail.

Mitigation:

- keep one serializer per variant;
- unit test serializers directly;
- avoid embedding payload logic inside JSX.

### Risk: over-generalized renderer

A generic form engine can become too abstract and hard to change.

Mitigation:

- keep the supported field controls intentionally small;
- prefer explicit resource registries over a single giant schema file;
- allow page-specific wrappers when needed.

### Risk: custom cases becoming impossible

Operators still need freeform power for odd integrations.

Mitigation:

- always keep at least one generic/custom variant per resource kind;
- never remove advanced JSON fields in phase 1.

## Task Breakdown

### Task 1: Create the shared form contract foundation

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/types.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/utils.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/validators.ts`

**Step 1: Write the failing tests**

Add tests proving:

- field visibility rules can be evaluated from a value map;
- serializer helpers normalize list fields consistently;
- JSON parsing helpers return readable validation errors.

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm test -- lib/forms/__tests__/types.test.ts
```

Expected: missing module or failing helper assertions.

**Step 3: Implement the minimal foundation**

Create the shared field/section/variant types and utilities.

**Step 4: Run tests to verify they pass**

Run the same targeted tests.

**Step 5: Commit**

```bash
git add apps/web/lib/forms
git commit -m "feat: add intake form contracts foundation"
```

### Task 2: Build the reusable form renderer

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-variant-picker.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/fields/*.tsx`

**Step 1: Write the failing component tests**

Cover:

- variant picker updates selected variant;
- hidden fields are not rendered;
- advanced fields stay behind disclosure by default.

**Step 2: Run the tests to verify they fail**

Run targeted UI tests or component tests for the new renderer.

**Step 3: Implement the renderer**

Keep support limited to the current needed controls.

**Step 4: Run tests to verify they pass**

Include targeted tests plus `npm run build`.

**Step 5: Commit**

```bash
git add apps/web/components/forms
git commit -m "feat: add reusable intake form renderer"
```

### Task 3: Migrate secrets to the unified intake model

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/secrets-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/secrets/page.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/secret-to-task.spec.ts`

**Step 1: Write the failing tests**

Cover:

- OpenAI variant prepopulates provider and kind;
- GitHub PAT variant shows the expected provider-scopes guidance;
- generic variant still permits freeform provider entry.

**Step 2: Run the tests to verify they fail**

Run targeted tests for secrets flow.

**Step 3: Implement the secrets registry and renderer usage**

Preserve `createSecretAction` and current success redirects.

**Step 4: Run tests to verify they pass**

Run targeted tests and `npm run build`.

**Step 5: Commit**

```bash
git add apps/web/components/secrets-form.tsx apps/web/app/secrets/page.tsx apps/web/lib/forms/secrets-contracts.ts apps/web/tests/secret-to-task.spec.ts
git commit -m "feat: unify secret intake variants"
```

### Task 4: Migrate capabilities to the unified intake model

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/capabilities-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/capabilities/page.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/approvals.spec.ts`

**Step 1: Write the failing tests**

Cover:

- OpenAI variant preselects `adapter_type=openai`;
- GitHub variant preselects `required_provider=github`;
- generic HTTP variant preserves advanced config access.

**Step 2: Run the tests to verify they fail**

Run targeted capability and approval flow tests.

**Step 3: Implement the capability registry and renderer usage**

Do not break existing secret binding or approval settings.

**Step 4: Run tests to verify they pass**

Run targeted tests and `npm run build`.

**Step 5: Commit**

```bash
git add apps/web/components/capability-form.tsx apps/web/app/capabilities/page.tsx apps/web/lib/forms/capabilities-contracts.ts apps/web/tests/approvals.spec.ts
git commit -m "feat: unify capability intake variants"
```

### Task 5: Add task templates and preserve custom task entry

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/tasks-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/tasks/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`

**Step 1: Write the failing tests**

Cover:

- `prompt_run` template prepopulates task type and starter input;
- `config_sync` and `account_read` show task-family-appropriate copy;
- `custom` keeps free-text task type editable.

**Step 2: Run the tests to verify they fail**

Run task and intake-variant tests.

**Step 3: Implement the task registry and renderer usage**

Preserve existing publishing behavior and redirects.

**Step 4: Run tests to verify they pass**

Run targeted tests and `npm run build`.

**Step 5: Commit**

```bash
git add apps/web/components/task-form.tsx apps/web/app/tasks/page.tsx apps/web/lib/forms/tasks-contracts.ts apps/web/tests/intake-variants.spec.ts
git commit -m "feat: add templated task intake variants"
```

### Task 6: Migrate agents to structured onboarding variants

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/agents/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/agents-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts`

**Step 1: Write the failing tests**

Cover:

- `general` variant keeps the current minimal fields;
- `task_scoped` surfaces `allowed_task_types`;
- `capability_scoped` surfaces `allowed_capability_ids`.

**Step 2: Run the tests to verify they fail**

Run targeted agent onboarding tests.

**Step 3: Implement the agent registry and renderer usage**

Allow the new fields to flow through `createAgentAction`.

**Step 4: Run tests to verify they pass**

Run targeted tests and `npm run build`.

**Step 5: Commit**

```bash
git add apps/web/app/agents/page.tsx apps/web/app/actions.ts apps/web/lib/forms/agents-contracts.ts
git commit -m "feat: add structured agent onboarding variants"
```

### Task 7: Final verification and docs cleanup

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/agent-quickstart.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-03-28-unified-front-end-intake-forms.md`

**Step 1: Run the full verification suite**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run build
npm run test:e2e
```

**Step 2: Verify no current creation flow regressed**

Confirm:

- secrets can still be created;
- capabilities can still be created;
- tasks can still be published;
- agents can still be created and return an API key.

**Step 3: Update docs if operator-facing behavior changed**

Reflect variant selectors and guided templates in the quickstart and relevant guides.

**Step 4: Commit**

```bash
git add docs/guides/agent-quickstart.md docs/plans/2026-03-28-unified-front-end-intake-forms.md
git commit -m "docs: describe unified intake form system"
```

## Success Criteria

The unified intake project is complete when:

- every create flow starts from a variant-aware form contract rather than handwritten field lists;
- operators can choose guided variants for common cases;
- generic/custom variants still exist for unusual cases;
- backend APIs and management auth behavior remain unchanged;
- build and E2E tests pass;
- adding a new intake variant no longer requires duplicating a full page-level form.
