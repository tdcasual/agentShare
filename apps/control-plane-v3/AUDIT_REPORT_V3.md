# Frontend Audit Report - Control Plane V3

## 技术栈确认

**是的，前端使用了现代 React 框架栈：**
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 3.4**
- **next-themes** (主题管理)
- **next-intl** (国际化)

---

## Anti-Patterns Verdict

**Verdict: 部分存在 AI 生成痕迹，但总体有设计感**

具体的 "AI slop" 痕迹：
- **Gradient text 作为标题冲击效果**：`.gradient-text` 类在首页标题 "双生宇宙" 上使用，这是 frontend-design skill 明确标记的 "DON'T" 反模式（装饰性而非语义性）。
- **Bounce-like easing**：`.card-kawaii` 使用了 `cubic-bezier(0.34, 1.56, 0.64, 1)`，这是一种弹性的、类似 bounce 的缓动曲线。Motion skill 明确反对使用 bounce/elastic easing。
- **过度使用 pink pastel + emoji 装饰**：虽然符合 Kawaii 主题方向，但大量漂浮 emoji 和粉色渐变可能让界面显得过于 "AI 可爱风"，缺少一些克制和精致感。

**好的方面**：没有使用典型的 "AI 调色盘"（cyan-on-dark、purple-to-blue 霓虹渐变、glassmorphism 泛滥），整体有明确的 Kawaii 主题方向。

---

## Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| Accessibility (A11y) | 78% | ⚠️ Needs Work |
| Performance | 72% | ⚠️ Needs Work |
| Theming / Design Tokens | 65% | ⚠️ Needs Work |
| Responsive Design | 85% | ✅ Good |
| Code Quality | 82% | ✅ Good |
| **Overall** | **76%** | **⚠️ Solid foundation, fixable issues** |

**Total Issues Found**: 14
- Critical: 1
- High: 4
- Medium: 5
- Low: 4

**Top 3 Most Critical Issues:**
1. **Input/Textarea label-input association missing** — WCAG A violation, blocks screen reader users.
2. **Unthrottled resize listener in `useDeviceType`** — Causes excessive re-renders and layout thrashing.
3. **Hard-coded colors mixed with tokens** — Breaks theme consistency and dark mode maintenance.

---

## Detailed Findings by Severity

### 🔴 Critical Issues

#### 1. Input/Textarea components lack proper label association
- **Location**: `src/shared/ui-primitives/input.tsx`, lines 13–48 (Input) and 53–77 (Textarea)
- **Severity**: Critical
- **Category**: Accessibility
- **Description**: The `Input` component renders a `<label>` when `label` prop is provided, but it does **not** set `htmlFor` on the label, nor does it generate/pass an `id` to the underlying `<input>`. The `Textarea` has the identical flaw.
- **Impact**: Screen readers cannot associate the label with the form field. Users navigating with assistive technology will not know what the input is for. This is a **WCAG 2.1 Level A** failure (1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2 Name, Role, Value).
- **Recommendation**: Generate a stable `id` (e.g. with `React.useId()`) and wire `htmlFor` on the label to the input's `id`. Also wire `aria-describedby` to the helper/error text elements.
- **Suggested command**: `/harden`

---

### 🟠 High-Severity Issues

#### 2. Unthrottled resize/orientation listeners cause performance degradation
- **Location**: `src/hooks/use-device-type.ts`, lines 119–126
- **Severity**: High
- **Category**: Performance
- **Description**: `window.addEventListener('resize', updateDeviceType)` is attached without throttling or debouncing. Every pixel of resize triggers state updates across every component using this hook.
- **Impact**: Layout thrashing, dropped frames during window resize, increased CPU/battery usage on mobile. In large pages this can freeze the UI during orientation changes.
- **Recommendation**: Throttle the handler to 100–200ms using `requestAnimationFrame` or a simple throttle utility.
- **Suggested command**: `/optimize`

#### 3. Badge component lacks dark mode support and uses hard-coded colors
- **Location**: `src/shared/ui-primitives/badge.tsx`
- **Severity**: High
- **Category**: Theming
- **Description**: All badge variants use static Tailwind utility classes (e.g. `bg-pink-100 text-pink-700`) with no dark mode variants. This makes badges visually broken or invisible in dark mode on certain displays.
- **Impact**: Inconsistent theming, poor readability in dark mode, maintenance burden when updating colors.
- **Recommendation**: Refactor to use CSS custom properties (`var(--kw-*)`) or add explicit `dark:` prefixes for every variant.
- **Suggested command**: `/normalize`

#### 4. Hard-coded colors scattered throughout UI, undermining design tokens
- **Location**: Widespread — `src/app/page.tsx`, `src/app/settings/page.tsx`, `src/shared/ui-primitives/card.tsx`, `src/components/layouts/responsive-layout.tsx`, etc.
- **Severity**: High
- **Category**: Theming
- **Description**: A large number of components mix CSS token variables (`var(--kw-text)`) with hard-coded hex values (`text-gray-800 dark:text-[#E8E8EC]`, `bg-[#f8f9fc] dark:bg-[#0f0f1a]`). `ResponsiveMainLayout` even uses a background color (`#f8f9fc`) that does not match the global `--kw-bg` token (`#fff5f7`).
- **Impact**: Theme changes become whack-a-mole; high maintenance cost; visual inconsistency between pages; custom theming or white-labeling is nearly impossible.
- **Recommendation**: Audit all components and migrate to the existing CSS custom property system in `globals.css`.
- **Suggested command**: `/normalize`

#### 5. `KawaiiBackground` has SSR/hydration instability risk
- **Location**: `src/components/kawaii/kawaii-background.tsx`, lines 28–42
- **Severity**: High
- **Category**: Performance / Resilience
- **Description**: `Math.random()` is called inside a `useEffect` to generate floating decoration positions. Because `useEffect` does not run during SSR, the initial server HTML and first client render may mismatch. Additionally, every time `resolvedTheme` changes, all 12 floating items are destroyed and recreated with new random positions, causing unnecessary DOM churn.
- **Impact**: Potential hydration mismatch warnings or flashes; unnecessary re-renders on theme toggle; cumulative layout shift risk.
- **Recommendation**: Use a seeded deterministic pseudo-random generator based on a stable key (e.g. theme name) or pre-compute positions in a module-level constant. Memoize items so they don't regenerate on every theme change.
- **Suggested command**: `/optimize`

---

### 🟡 Medium-Severity Issues

#### 6. `transition: all` and bounce-like easing on card hover
- **Location**: `src/app/globals.css`, lines 263–283 (`.card-kawaii`)
- **Severity**: Medium
- **Category**: Performance / Motion Anti-Pattern
- **Description**: `.card-kawaii` declares `transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`. Transitioning `all` causes the browser to watch every animatable property. The bezier curve `1.56` overshoot is a bounce/elastic feel, which the frontend-design skill explicitly discourages as "dated and tacky".
- **Impact**: Sub-optimal paint/composite performance on hover; motion feels unpolished and artificially "cute" in a way that can feel AI-generated.
- **Recommendation**: Change to `transition: transform 0.3s ease-out, box-shadow 0.3s ease-out` and use a smooth deceleration curve like `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Suggested command**: `/animate`

#### 7. Gradient text used for decorative heading impact
- **Location**: `src/app/page.tsx`, line 153 (`<span className="gradient-text">{t('hub.dualCosmos')}</span>`)
- **Severity**: Medium
- **Category**: Anti-Pattern / Visual Design
- **Description**: The frontend-design skill classifies gradient text on headings as a "fingerprint of AI-generated work" because it is decorative rather than meaningful and has become overused.
- **Impact**: Cheapens the visual identity; makes the interface feel templated.
- **Recommendation**: Remove the gradient text effect from the main heading. If emphasis is needed, use weight, size, or a subtle accent color instead.
- **Suggested command**: `/distill`

#### 8. `TabletSidebar` uses hard-coded Chinese labels while other sidebars use i18n
- **Location**: `src/components/tablet-sidebar.tsx`, lines 25–31
- **Severity**: Medium
- **Category**: i18n / Consistency
- **Description**: `TabletSidebar` hard-codes Chinese strings (`控制台`, `令牌`, `任务`, etc.) directly in the component. The desktop `Sidebar` and `MobileNav` both use `useI18n()` for labels.
- **Impact**: Inconsistent user experience; non-Chinese users see mixed languages when switching between mobile and tablet/desktop.
- **Recommendation**: Refactor `TabletSidebar` to use the same `labelKey` / `useI18n()` pattern as the desktop `Sidebar`.
- **Suggested command**: `/harden`

#### 9. `ResponsiveMainLayout` appears unused or redundant, and lacks desktop sidebar
- **Location**: `src/components/layouts/responsive-layout.tsx`
- **Severity**: Medium
- **Category**: Architecture / Responsive
- **Description**: This component renders `TabletSidebar` but nothing for desktop. The actual application layout uses `Layout` in `src/interfaces/human/layout/index.tsx`, which properly includes the desktop `Sidebar`. Keeping `ResponsiveMainLayout` in the codebase is confusing and risky if someone imports it.
- **Impact**: Code duplication; risk of inconsistent layouts; dead code maintenance burden.
- **Recommendation**: Either align `ResponsiveMainLayout` with `Layout` by importing the desktop `Sidebar`, or deprecate/remove it if it is truly unused.
- **Suggested command**: `/distill`

#### 10. Missing `aria-describedby` wiring for Input helpers/errors
- **Location**: `src/shared/ui-primitives/input.tsx`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: While `error` and `helper` text are visually rendered below the input, they are not programmatically associated with the input via `aria-describedby`.
- **Impact**: Screen reader users may not hear the helper text or error message when focused on the input.
- **Recommendation**: Generate unique IDs for helper and error elements and pass them to `aria-describedby` on the `<input>`.
- **Suggested command**: `/harden`

---

### 🟢 Low-Severity Issues

#### 11. `Avatar` image lacks responsive srcset
- **Location**: `src/shared/ui-primitives/avatar.tsx`, lines 54–63
- **Severity**: Low
- **Category**: Performance
- **Description**: The `<img>` tag uses `loading="lazy"` (good) but does not provide `srcset` or `sizes`.
- **Impact**: Users on high-DPI screens may get blurry avatars; users on slow connections may download unnecessarily large images.
- **Recommendation**: If the image source supports multiple sizes, add `srcset`. Since the source is often dynamic, this may be a best-effort improvement.
- **Suggested command**: `/optimize`

#### 12. `KawaiiBackground` regenerates all floating items on theme change
- **Location**: `src/components/kawaii/kawaii-background.tsx`, lines 28–42
- **Severity**: Low
- **Category**: Performance
- **Description**: Related to Issue #5. On every theme toggle, 12 DOM nodes are removed and recreated.
- **Impact**: Minor unnecessary React reconciler work.
- **Recommendation**: Separate the emoji theme switch from position generation. Keep positions stable and only swap the emoji characters.
- **Suggested command**: `/optimize`

#### 13. `next.config.mjs` has `ignoreDuringBuilds: true` for ESLint
- **Location**: `next.config.mjs`
- **Severity**: Low
- **Category**: Code Quality
- **Description**: ESLint is disabled during Next.js builds. While the project has a separate lint script, this bypasses the safety net that would catch issues at build time.
- **Impact**: Lint errors can slip into production builds undetected.
- **Recommendation**: Remove `eslint.ignoreDuringBuilds: true` or ensure CI strictly runs `npm run lint` before every deploy.
- **Suggested command**: `/harden`

#### 14. `TabletSidebar` nav items have hard-coded `badge: 3`
- **Location**: `src/components/tablet-sidebar.tsx`, line 28
- **Severity**: Low
- **Category**: Data Integrity
- **Description**: The task nav item shows a static badge of `3` regardless of actual data.
- **Impact**: Misleading UI; users see a notification that may not exist.
- **Recommendation**: Wire the badge to real task data or remove the static badge.
- **Suggested command**: `/harden`

---

## Patterns & Systemic Issues

### 1. Hard-coded colors undermine the token system
The project has invested in a fairly comprehensive CSS custom property palette (`--kw-*`) in `globals.css`, but components frequently bypass it with Tailwind's default gray scale (`text-gray-500`, `bg-white`, `dark:text-[#9CA3AF]`). This creates a two-tier system where light mode looks polished but dark mode and future theme variations are fragile.

### 2. Device-type hook is a single point of performance failure
`useDeviceType` is used by `ResponsiveContainer`, `ResponsiveGrid`, `ResponsiveCard`, `ResponsiveText`, `DeviceOnly`, `ResponsiveSpacing`, `MobileNav`, `TabletSidebar`, and `Layout`. An unthrottled resize listener propagates state changes to dozens of memoized components. Even with `memo`, the hook itself re-runs on every pixel of resize.

### 3. Form primitives need an accessibility pass
The `Input` and `Textarea` primitives are visually polished but lack the ARIA wiring that makes them usable for assistive technology. Fixing the label association and `aria-describedby` wiring in the primitive will automatically improve accessibility across every form in the application.

---

## Positive Findings

### 1. Excellent modal accessibility
`Modal` in `src/shared/ui-primitives/modal.tsx` implements focus trapping, initial focus management, focus restoration on close, Escape key dismissal, and correct `role="dialog"` / `aria-modal` / `aria-labelledby` usage. This is production-grade a11y work.

### 2. Skip link present
`layout.tsx` includes a visually-hidden skip link ("跳转到主要内容") that becomes visible on focus, satisfying WCAG 2.4.1 Bypass Blocks.

### 3. Motion respects user preferences
`globals.css` includes `@media (prefers-reduced-motion: reduce)` and `@media (prefers-contrast: high)` with thoughtful overrides. All custom animations are disabled for users who prefer reduced motion.

### 4. Toggle buttons correctly use `aria-pressed`
Automated tests (`filter-toggle-accessibility.test.ts`, `custom-selection-accessibility.test.ts`) enforce that filter chips and mode toggles expose their pressed state to assistive technology.

### 5. Mobile touch targets are appropriately sized
`MobileNav` links and buttons declare `min-h-[44px] min-w-[64px]`, meeting the WCAG 2.5.5 Target Size recommendation.

### 6. Viewport scaling is not restricted
`viewport` in `layout.tsx` does **not** set `maximumScale`, respecting WCAG 1.4.4 Resize Text and 1.4.10 Reflow.

### 7. PWA implementation is thorough
The project includes a web manifest, Apple web app metadata, service worker registration, and both install + update prompts.

---

## Recommendations by Priority

### Immediate (This Week)
1. **Fix Input/Textarea label association** (Issue #1) — Unblocks screen reader users.
2. **Throttle `useDeviceType` resize listener** (Issue #2) — Fixes performance regression.
3. **Stabilize `KawaiiBackground` hydration** (Issue #5) — Prevents SSR mismatch and layout shift.

### Short-term (This Sprint)
4. **Migrate Badge to tokens / add dark mode** (Issue #3).
5. **Audit and consolidate hard-coded colors** (Issue #4) — Focus on the 5 most-used components first.
6. **Fix card hover transition and easing** (Issue #6).
7. **Remove or align `ResponsiveMainLayout`** (Issue #9).

### Medium-term (Next Sprint)
8. **Internationalize `TabletSidebar`** (Issue #8).
9. **Add `aria-describedby` to Input primitives** (Issue #10).
10. **Re-enable ESLint during builds** (Issue #13).

### Long-term (Nice-to-have)
11. **Add `srcset` to Avatar** (Issue #11).
12. **Wire real data to `TabletSidebar` badge** (Issue #14).

---

## Suggested Commands for Fixes

| Command | Issues Addressed | Description |
|---------|-----------------|-------------|
| `/harden` | #1, #8, #10, #13, #14 | Fix a11y gaps, i18n inconsistencies, and build-time checks |
| `/optimize` | #2, #5, #11, #12 | Throttle listeners, stabilize hydration, optimize images |
| `/normalize` | #3, #4 | Align components with the design token system |
| `/animate` | #6 | Refine motion curves and transition properties |
| `/distill` | #7, #9 | Remove decorative anti-patterns and redundant layout components |

---

*Report generated for `apps/control-plane-v3` — Next.js 15 + React 19 + Tailwind CSS 3.4*
