# Modern Console UI Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the web console into a calmer, more modern, Chinese-first operator experience that feels clean on desktop and mobile without losing operational clarity.

**Architecture:** Keep the existing Next.js App Router structure and refine the interface through three layers: shared shell/chrome, page templates, and shared UI language. Use TDD with Playwright for regression coverage, centralize UX wording and state labels in shared helpers, and evolve the CSS system toward lighter chrome, fewer chips/cards, and more context-aware responsive layouts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS in `apps/web/app/globals.css`, Playwright E2E tests in `apps/web/tests`

---

## Before You Start

- Work in a dedicated git worktree, not on `main`.
- Use `@frontend-design` for visual decisions, `@adapt` for responsive behavior, `@clarify` for UX copy, and `@verification-before-completion` before any completion claim.
- Keep commits small and frequent.
- Do not introduce a new component library or CSS framework.
- Do not add dark mode in this plan.

## Global Acceptance Criteria

- Top chrome feels quieter: no slogan, no marketing tone, less stacked framing.
- Chinese copy is default-quality, not “translated English”.
- Desktop feels dense but calm; mobile feels light, not like squeezed desktop.
- `Home`, `Quickstart`, `Agent self-serve`, and `Tasks` clearly show what to do next.
- No horizontal page overflow at `390px` viewport width.
- `npm run build` passes.
- `npm run test:e2e -- tests/console.spec.ts` passes.
- New UI-review Playwright tests added in this plan pass.

---

### Task 1: Freeze the New UI Baseline with Failing Visual-Intent Tests

**Files:**
- Modify: `apps/web/tests/console.spec.ts`
- Create: `apps/web/tests/ui-review.spec.ts`
- Modify: `apps/web/tests/helpers.ts`

**Step 1: Write the failing test**

Create `apps/web/tests/ui-review.spec.ts` with targeted assertions for the quieter shell and lighter page hierarchy.

```ts
import { expect, test } from "@playwright/test";
import { setChineseLocale } from "./helpers";

test("shell brand is product-only without slogan copy", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.getByText("Agent 控制平面", { exact: true })).toBeVisible();
  await expect(page.getByText("人类与 Agent 协作运营")).toHaveCount(0);
});

test("quickstart tools rail stays compact on desktop", async ({ page }) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/quickstart");

  const docsButton = page.getByRole("link", { name: "API 文档" });
  await expect(docsButton).toBeVisible();
  await expect(docsButton).toHaveJSProperty("offsetHeight", 53);
});

test("mobile quickstart has no page-level horizontal overflow", async ({ page }) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quickstart");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts
```

Expected: FAIL on at least one assertion because the current shell/page layout is still too noisy or not yet compact enough.

**Step 3: Write minimal implementation**

Keep the existing `helpers.ts` cookie helper and add any missing helper needed for viewport reuse only if the tests demand it. Do not redesign anything yet; only make the test file compile.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts
```

Expected: still FAIL functionally, but compile and execute correctly.

**Step 5: Commit**

```bash
git add apps/web/tests/ui-review.spec.ts apps/web/tests/console.spec.ts apps/web/tests/helpers.ts
git commit -m "test: add modern console ui review coverage"
```

---

### Task 2: Simplify Shared Shell Chrome

**Files:**
- Modify: `apps/web/components/nav-shell.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/tests/ui-review.spec.ts`
- Test: `apps/web/tests/console.spec.ts`

**Step 1: Write the failing test**

Extend `apps/web/tests/ui-review.spec.ts` with a shell-specific structure test:

```ts
test("shell topbar contains product name and state pill without secondary slogan block", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.locator(".brand-copy strong")).toHaveText("Agent 控制平面");
  await expect(page.locator(".brand-copy span")).toHaveCount(0);
  await expect(page.locator(".shell-pill")).toContainText("登录前仅可读");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "shell"
```

Expected: FAIL until the topbar structure is simplified.

**Step 3: Write minimal implementation**

In `apps/web/components/nav-shell.tsx`:
- Keep the `AC` mark.
- Keep only one product-name line in `.brand-copy`.
- Do not add any new slogan or helper sentence there.

In `apps/web/app/globals.css`:
- Tighten `.shell-topbar` spacing.
- Keep `.brand-copy` as a single-line product label.
- Reduce topbar visual weight slightly.
- Do not add extra chrome decorations.

Target structure:

```tsx
<div className="shell-brand">
  <Link href="/" className="brand-mark">AC</Link>
  <div className="brand-copy">
    <strong>{tr(locale, "Agent Control Plane", "Agent 控制平面")}</strong>
  </div>
</div>
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "shell"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/nav-shell.tsx apps/web/app/globals.css apps/web/tests/ui-review.spec.ts
git commit -m "feat: simplify shared shell chrome"
```

---

### Task 3: Rework the Visual System Toward a Quieter Editorial Console

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/lib/ui.ts`
- Test: `apps/web/tests/ui-review.spec.ts`

**Step 1: Write the failing test**

Add a structural assertion that critical chrome remains readable while page surfaces get lighter:

```ts
test("primary pages keep one main title and avoid stacked duplicate framing", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/tasks");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".notice")).toHaveCount(1);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "duplicate framing"
```

Expected: FAIL if stacked notices or repeated framing remain.

**Step 3: Write minimal implementation**

In `apps/web/app/globals.css`:
- Reduce border contrast and shadow density for `.panel`, `.card`, `.list-item`, `.notice`.
- Keep the refined light palette but remove any “safe dashboard template” feel.
- Tighten the rhythm:
  - less repeated rounded-box emphasis
  - clearer difference between primary panel and supporting panel
  - lighter chip treatment
- Add or refine:

```css
.panel {
  border: 1px solid color-mix(in oklab, var(--ink) 8%, transparent);
  box-shadow: 0 12px 32px rgba(34, 41, 57, 0.06);
}

.chip {
  min-height: 30px;
  padding: 5px 10px;
  background: color-mix(in oklab, white 84%, var(--surface-soft));
}
```

In `apps/web/app/layout.tsx`:
- Keep current fonts unless a font change is clearly necessary.
- Do not introduce another decorative font.

In `apps/web/lib/ui.ts`:
- Keep labels centralized.
- Ensure Chinese labels stay short and operational.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts
```

Expected: PASS or fail only on later tasks not yet implemented.

**Step 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx apps/web/lib/ui.ts apps/web/tests/ui-review.spec.ts
git commit -m "feat: refine global visual system for quieter console"
```

---

### Task 4: Rebuild the Homepage as a Dispatch Board

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/tests/console.spec.ts`
- Test: `apps/web/tests/ui-review.spec.ts`

**Step 1: Write the failing test**

Add a homepage intent test:

```ts
test("homepage surfaces next actions before explanation blocks", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
  await expect(page.getByRole("link", { name: "浏览手册" })).toBeVisible();
  await expect(page.getByText("平台姿态")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "homepage surfaces"
```

Expected: FAIL if the page still overweights explanation over dispatch.

**Step 3: Write minimal implementation**

In `apps/web/app/page.tsx`:
- Reduce conceptual copy length by ~30-40%.
- Keep three core routes only:
  - build trust
  - run work
  - teach agents
- Make the hero read like a dispatch board, not a pitch.
- Keep “platform posture” as a small supporting block, not a second hero.

Preferred shape:

```tsx
<section className="dashboard-stage">
  <article className="panel feature-panel dashboard-primary stack">...</article>
  <aside className="panel dashboard-guide stack">...</aside>
</section>
<section className="dashboard-grid section-space">...</section>
<section className="panel compact-panel section-space">...</section>
```

But compress copy so users can scan the page in one pass.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/console.spec.ts --grep "homepage"
npm run test:e2e -- tests/ui-review.spec.ts --grep "homepage surfaces"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/globals.css apps/web/tests/console.spec.ts apps/web/tests/ui-review.spec.ts
git commit -m "feat: redesign homepage as dispatch board"
```

---

### Task 5: Turn Quickstart into a Cleaner Script-First Guide

**Files:**
- Modify: `apps/web/app/quickstart/page.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/tests/console.spec.ts`
- Test: `apps/web/tests/ui-review.spec.ts`

**Step 1: Write the failing test**

Add a desktop compactness and mobile code-block test:

```ts
test("quickstart keeps tools rail compact and code blocks scroll safely", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/quickstart");

  const codeBlocks = page.locator(".code-block");
  await expect(codeBlocks.first()).toBeVisible();
  await expect(page.getByRole("link", { name: "API 文档" })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "quickstart keeps"
```

Expected: FAIL until the quickstart rail and code area are polished.

**Step 3: Write minimal implementation**

In `apps/web/app/quickstart/page.tsx`:
- Keep the six-step model.
- Shorten all intro copy.
- Make the tool rail a compact action stack.
- Keep Chinese labels:
  - `标准路径`
  - `Agent 访问密钥`
  - `API 文档`
  - `OpenAPI 描述`

In `apps/web/app/globals.css`:
- Keep `.action-stack`.
- Ensure `.code-block` uses horizontal scrolling safely and not page overflow.

Use:

```css
.action-stack {
  display: grid;
  gap: 10px;
}

.code-block {
  overflow-x: auto;
  scrollbar-gutter: stable;
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/console.spec.ts --grep "quickstart"
npm run test:e2e -- tests/ui-review.spec.ts --grep "quickstart"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/quickstart/page.tsx apps/web/app/globals.css apps/web/tests/console.spec.ts apps/web/tests/ui-review.spec.ts
git commit -m "feat: refine quickstart into script-first guide"
```

---

### Task 6: Tighten Agent Self-Serve into a Focused Workbench

**Files:**
- Modify: `apps/web/app/agent/page.tsx`
- Modify: `apps/web/app/agent/agent-self-serve.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/lib/ui.ts`
- Test: `apps/web/tests/console.spec.ts`

**Step 1: Write the failing test**

Expand the current agent test with one stronger expectation:

```ts
test("agent self-serve emphasizes one active task workbench", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/agent");

  await expect(page.getByRole("heading", { name: "连接身份" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "任务队列" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "手册检索" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "执行动作" })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/console.spec.ts --grep "agent self-serve"
```

Expected: FAIL if the structure is not yet shaped as a workbench.

**Step 3: Write minimal implementation**

In `apps/web/app/agent/agent-self-serve.tsx`:
- Keep the four-section flow:
  - connect identity
  - task queue
  - playbook search
  - execution actions
- Keep one “active task” status block visible inside the execution panel.
- Replace raw task status strings with centralized labels from `apps/web/lib/ui.ts`.
- Keep copy short and Chinese-first.

In `apps/web/app/globals.css`:
- Keep `.agent-console`, `.agent-main-column`, `.agent-side-column`, `.agent-active-task`.
- Keep the execution panel sticky on wide screens only.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/console.spec.ts --grep "agent self-serve"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/agent/page.tsx apps/web/app/agent/agent-self-serve.tsx apps/web/app/globals.css apps/web/lib/ui.ts apps/web/tests/console.spec.ts
git commit -m "feat: tighten agent self-serve workbench"
```

---

### Task 7: Normalize Data Pages and Reduce Chip Noise

**Files:**
- Modify: `apps/web/components/tasks-table.tsx`
- Modify: `apps/web/components/approvals-table.tsx`
- Modify: `apps/web/components/runs-table.tsx`
- Modify: `apps/web/app/tasks/page.tsx`
- Modify: `apps/web/app/approvals/page.tsx`
- Modify: `apps/web/app/runs/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/lib/ui.ts`
- Test: `apps/web/tests/ui-review.spec.ts`

**Step 1: Write the failing test**

Add a data-page consistency test:

```ts
test("task and approval cards show concise operational metadata", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/tasks");

  await expect(page.getByText("任务队列")).toBeVisible();
  await expect(page.locator(".chip")).toHaveCount(await page.locator(".chip").count());
});
```

Then rewrite it to assert a specific concise label set once you know the final UI wording.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "operational metadata"
```

Expected: FAIL until card metadata is normalized.

**Step 3: Write minimal implementation**

In the three shared table/list components:
- Keep only the most useful chips:
  - status
  - task type / action type
  - approval mode or lease posture when operationally important
- Move secondary metadata into lighter muted lines where possible.

Use centralized labels from `apps/web/lib/ui.ts`:

```ts
taskStatusLabel(locale, task.status)
approvalModeLabel(locale, task.approval_mode)
leasePolicyLabel(locale, task.lease_allowed)
actionTypeLabel(locale, approval.action_type)
```

In `apps/web/app/globals.css`:
- Lighten chip visuals slightly.
- Avoid making every metadata point a pill.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts
```

Expected: PASS or only fail on later tasks.

**Step 5: Commit**

```bash
git add apps/web/components/tasks-table.tsx apps/web/components/approvals-table.tsx apps/web/components/runs-table.tsx apps/web/app/tasks/page.tsx apps/web/app/approvals/page.tsx apps/web/app/runs/page.tsx apps/web/app/globals.css apps/web/lib/ui.ts apps/web/tests/ui-review.spec.ts
git commit -m "feat: normalize data pages and reduce metadata noise"
```

---

### Task 8: Normalize Form and Knowledge Pages

**Files:**
- Modify: `apps/web/components/task-form.tsx`
- Modify: `apps/web/components/secrets-form.tsx`
- Modify: `apps/web/components/capability-form.tsx`
- Modify: `apps/web/app/secrets/page.tsx`
- Modify: `apps/web/app/capabilities/page.tsx`
- Modify: `apps/web/app/playbooks/page.tsx`
- Modify: `apps/web/app/agents/page.tsx`
- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/lib/ui.ts`

**Step 1: Write the failing test**

Add a copy-quality and naming test:

```ts
test("management pages use Chinese-first labels without noisy mixed terminology", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/login");

  await expect(page.getByText("管理引导口令")).toBeVisible();
  await expect(page.getByText("Bootstrap 管理凭据")).toHaveCount(0);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "Chinese-first labels"
```

Expected: FAIL until labels and terminology are normalized.

**Step 3: Write minimal implementation**

Update all these pages/components so that:
- Chinese copy is short and direct.
- `Agent 列表` and `Agent 自助台` are clearly distinct.
- `服务提供方`, `访问密钥`, `租约时长`, `OpenAPI 描述`, `API 文档` remain consistent.
- Long instructional paragraphs are cut down.

Use `apps/web/lib/ui.ts` for:
- product labels
- docs labels
- status labels
- risk labels

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "Chinese-first labels"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/task-form.tsx apps/web/components/secrets-form.tsx apps/web/components/capability-form.tsx apps/web/app/secrets/page.tsx apps/web/app/capabilities/page.tsx apps/web/app/playbooks/page.tsx apps/web/app/agents/page.tsx apps/web/app/login/page.tsx apps/web/app/globals.css apps/web/lib/ui.ts apps/web/tests/ui-review.spec.ts
git commit -m "feat: normalize form and knowledge page language"
```

---

### Task 9: Responsive and Motion Polish

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/nav-shell.tsx`
- Test: `apps/web/tests/ui-review.spec.ts`
- Test: `apps/web/tests/console.spec.ts`

**Step 1: Write the failing test**

Add viewport-specific tests:

```ts
test("mobile homepage uses compact nav trigger and full-width primary actions", async ({ page }) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByText("展开导航")).toBeVisible();
  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts --grep "mobile homepage"
```

Expected: FAIL if mobile spacing or nav trigger regressed.

**Step 3: Write minimal implementation**

In `apps/web/app/globals.css`:
- Keep breakpoints at `1200`, `920`, `720`.
- Continue reducing stacked density on small screens.
- Make sure:
  - tool rails become vertical stacks
  - buttons are full-width on mobile only
  - code blocks remain scrollable without page overflow
  - sticky panels disable on narrower screens

Do not add gratuitous motion. Keep only current subtle fades and respect reduced motion.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run test:e2e -- tests/ui-review.spec.ts
npm run test:e2e -- tests/console.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/globals.css apps/web/components/nav-shell.tsx apps/web/tests/ui-review.spec.ts apps/web/tests/console.spec.ts
git commit -m "feat: polish responsive behavior and quiet motion"
```

---

### Task 10: Final Verification and Screenshot Review

**Files:**
- Modify: `apps/web/playwright.config.ts` only if verification infra needs port isolation
- Output: `apps/web/output/playwright/`
- Reference: `apps/web/output/playwright/ui-audit.json`

**Step 1: Write the failing test**

Do not add a new product test here. This is a verification task.

**Step 2: Run test to verify it fails**

Skip. This task is for final verification only.

**Step 3: Write minimal implementation**

No product code unless verification exposes a concrete issue.

Generate screenshots for:
- `/`
- `/quickstart`
- `/tasks`
- `/agent`

At:
- desktop `1440x1200`
- mobile `390x844`

Save artifacts under:

```text
apps/web/output/playwright/
```

**Step 4: Run test to verify it passes**

Run exactly:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web
npm run build
npm run test:e2e -- tests/console.spec.ts
npm run test:e2e -- tests/ui-review.spec.ts
```

Then run a headed or scripted Playwright review to capture screenshots and confirm:
- no slogan in top shell
- no page-level horizontal overflow on mobile
- quickstart tool rail stays compact
- agent workbench hierarchy is obvious

**Step 5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/output/playwright
git commit -m "chore: verify modern console ui refinement"
```

---

## Notes for the Implementer

- Do not introduce new pages, routing layers, or design dependencies unless blocked.
- Prefer modifying `apps/web/app/globals.css` and existing components before creating new abstraction layers.
- If a change only affects copy or label semantics, update `apps/web/lib/ui.ts` first and reuse it everywhere.
- If a page still looks “AI-generated”, the likely culprits are:
  - too many equal-weight cards
  - too many chips
  - too much explanation copy
  - chrome stacked above content

## Final Definition of Done

- Shared chrome is quiet and product-like.
- Home, Quickstart, Agent, and Tasks feel like one system.
- Chinese labels are consistent and concise.
- Mobile layouts are intentionally rearranged, not merely shrunk.
- All plan verification commands pass with fresh output.

Plan complete and saved to `docs/plans/2026-03-26-modern-console-ui-refinement.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
