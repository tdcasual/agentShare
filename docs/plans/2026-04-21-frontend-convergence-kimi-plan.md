# Frontend Convergence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the control-plane frontend from a cute demo-like UI into a more disciplined, governance-oriented console without changing routing, domain behavior, or backend contracts.

**Architecture:** Keep the current Next.js app structure and page routing intact. Converge the frontend by tightening design tokens, removing decorative excess, fixing motion/a11y inconsistencies, centralizing repeated shell navigation config, and refining the highest-traffic pages plus shared primitives.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, custom CSS variables, Vitest, ESLint, Prettier

---

## Design Direction

- Product tone: calm, precise, trustworthy, operational
- Preserve: light warmth, soft edges, approachable brand character
- Remove or reduce: floating emoji fields, repeated pink/purple gradients, glassmorphism, decorative glow, toy-like loading states
- Favor: restrained surfaces, neutral-tinted backgrounds, clearer hierarchy, purposeful accent usage, fewer one-off motion styles
- Constraint: do not redesign information architecture or change role-based navigation behavior

## Scope Guardrails

- In scope:
  - shared design tokens and global styles
  - shared primitives used across the shell
  - shell navigation convergence
  - login/setup/system state pages
  - PWA/install/update/offline prompts
- Out of scope:
  - backend API/schema changes
  - route additions/removals
  - domain workflow logic rewrites
  - new libraries unless strictly necessary

## Acceptance Criteria

- The UI reads as a professional control plane, not a kawaii concept demo.
- Global motion is consistent, valid, and reduced-motion safe.
- Shared interactive primitives use cleaner semantics and focus behavior.
- Mobile/tablet/desktop navigation sources are centralized or derived from one schema.
- `npm test -- --run` and `npm run build` pass.
- `npm run check` should be as close to passing as possible; at minimum, no new formatting/lint regressions are introduced.

### Task 1: Establish the convergence baseline

**Files:**
- Modify: `apps/control-plane-v3/src/app/globals.css`
- Modify: `apps/control-plane-v3/tailwind.config.js`
- Modify: `apps/control-plane-v3/src/themes/kawaii/index.ts`
- Reference: `apps/control-plane-v3/src/shared/ui-primitives/button.tsx`
- Reference: `apps/control-plane-v3/src/shared/ui-primitives/card.tsx`

**Step 1: Normalize visual intent**

- Shift the token system away from candy-heavy gradients toward softer neutrals plus one controlled accent range.
- Keep `--kw-primary-*` compatibility, but make surfaces/borders/text less pastel and more operational.

**Step 2: Remove dead or invalid motion definitions**

- Fix invalid CSS such as dark-scoped keyframes.
- Make Tailwind animation utilities match the classes used in the app.
- Eliminate theme animation definitions that are not actually wired into the build path or wire them properly.

**Step 3: Reduce decorative utilities**

- Tone down `shadow-glow`, glass-heavy styles, and hover transforms so they feel intentional rather than playful.
- Keep reduced-motion support intact.

**Step 4: Verify**

Run:

```bash
cd apps/control-plane-v3
npm run build
```

Expected: successful build with no missing utility-class assumptions.

### Task 2: Converge shared primitives and semantics

**Files:**
- Modify: `apps/control-plane-v3/src/shared/ui-primitives/button.tsx`
- Modify: `apps/control-plane-v3/src/shared/ui-primitives/card.tsx`
- Modify: `apps/control-plane-v3/src/shared/ui-primitives/modal.tsx`
- Modify: `apps/control-plane-v3/src/shared/ui-primitives/input.tsx`
- Reference: `apps/control-plane-v3/src/components/language-switcher.tsx`

**Step 1: Simplify button and card styling**

- Reduce always-on gradients and playful motion in primary actions.
- Keep one strong primary button style, with secondary/ghost variants feeling lighter and more product-grade.

**Step 2: Improve semantic correctness**

- Avoid forcing non-interactive cards into `role="region"` by default.
- Avoid synthetic click proxy behavior when a real button/link would be more correct.
- Tighten modal semantics, focus order, and close affordances.

**Step 3: Preserve accessibility**

- Keep visible focus styles.
- Ensure inputs, modals, and action surfaces remain keyboard friendly.

**Step 4: Verify**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run
```

Expected: shared-component tests still pass.

### Task 3: Centralize shell navigation config

**Files:**
- Modify: `apps/control-plane-v3/src/components/mobile-nav.tsx`
- Modify: `apps/control-plane-v3/src/components/tablet-sidebar.tsx`
- Modify: `apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx`
- Create or modify: `apps/control-plane-v3/src/lib/control-plane-links.ts`

**Step 1: Create one navigation source of truth**

- Define shell navigation metadata once: href, translation key, icon id/component, required role, shell placement rules.
- Keep current role gating and settings placement behavior.

**Step 2: Refactor mobile/tablet/desktop navigation**

- Derive each shell variant from the shared schema rather than hand-maintaining three lists.
- Preserve current responsive behavior and route targeting.

**Step 3: Verify**

- Confirm no route disappears for any role.
- Re-run existing navigation-related tests.

### Task 4: Refine high-traffic pages and global shell atmosphere

**Files:**
- Modify: `apps/control-plane-v3/src/components/kawaii/kawaii-background.tsx`
- Modify: `apps/control-plane-v3/src/app/login/page.tsx`
- Modify: `apps/control-plane-v3/src/app/setup/page.tsx`
- Modify: `apps/control-plane-v3/src/app/page.tsx`
- Modify: `apps/control-plane-v3/src/components/runtime-provider.tsx`
- Modify: `apps/control-plane-v3/src/components/route-guard.tsx`
- Modify: `apps/control-plane-v3/src/app/not-found.tsx`
- Modify: `apps/control-plane-v3/src/app/offline/page.tsx`
- Modify: `apps/control-plane-v3/src/components/error-boundary.tsx`

**Step 1: Reduce ambient decoration**

- Replace full-screen floating emoji clutter with subtle background structure.
- Keep personality, but make it secondary to content.

**Step 2: Converge system-state pages**

- Make login, setup, not-found, offline, route-guard, runtime error/loading states share one calmer visual language.
- Remove duplicate decorative motifs and repeated copy where possible.

**Step 3: Improve information hierarchy**

- Use fewer chips, fewer decorative badges, fewer repeated gradients.
- Increase clarity of titles, support text, and primary actions.

**Step 4: Verify**

Run:

```bash
cd apps/control-plane-v3
npm run build
```

Expected: all app routes compile and render successfully.

### Task 5: Repair small but concrete UX/A11y inconsistencies

**Files:**
- Modify: `apps/control-plane-v3/src/components/language-switcher.tsx`
- Modify: `apps/control-plane-v3/src/components/pwa/pwa-update-prompt.tsx`
- Modify: `apps/control-plane-v3/src/components/pwa/pwa-install-prompt.tsx`
- Modify: `apps/control-plane-v3/src/hooks/use-pwa.ts`

**Step 1: Fix ARIA contract mismatches**

- Make the language switcher popup semantics consistent with its actual structure.

**Step 2: Fix prompt motion and interaction quality**

- Replace missing animation classes or define them properly.
- Keep update/install prompts noticeable but less noisy.

**Step 3: Sanity-check copy and affordances**

- Ensure dismiss/update/install/close actions remain obvious and keyboard reachable.

### Task 6: Final verification and cleanup

**Files:**
- Modify if needed: formatting-touched frontend files only

**Step 1: Run verification**

```bash
cd apps/control-plane-v3
npm test -- --run
npm run build
npm run check
```

Expected:

- tests pass
- build passes
- if `npm run check` still fails, failures should be limited to pre-existing style drift and should be fixed if touched by this change set

**Step 2: Produce a short change summary**

- What visual direction changed
- Which primitives were converged
- Which duplicated configs were centralized
- Remaining debt not addressed in this pass

## Recommended Execution Order

1. Task 1 baseline and motion repairs
2. Task 2 primitives
3. Task 3 shell navigation convergence
4. Task 4 page refinement
5. Task 5 targeted UX/A11y repairs
6. Task 6 verification and cleanup

## Kimi Execution Prompt Notes

- Do not touch backend code.
- Prefer editing existing files over introducing new abstractions unless they remove real duplication.
- Keep current route paths and role gates unchanged.
- Avoid adding new dependencies.
- Favor convergence and removal over embellishment.
