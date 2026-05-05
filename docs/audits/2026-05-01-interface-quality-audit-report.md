# Agent Share 界面质量审计报告

**审计日期**: 2026-05-01  
**审计范围**: `apps/control-plane-v3/src` 前端界面  
**审计维度**: AI Slop 反模式、可访问性 (A11y)、主题一致性、响应式设计  
**当前 Commit**: `4efee3d`  
**审计人**: Kimi Code CLI

---

## 反模式裁决 (Anti-Patterns Verdict)

**❌ 不通过。** 界面呈现出大量 2024–2025 年 AI 生成界面的典型指纹。

项目采用了显式记录的 "kawaii / 二次元" 美学风格（见 `UI_KAWAII_IMPROVEMENTS.md`），但依据 `frontend-design` skill 的评判标准，这些恰恰是使界面被立即识别为 AI 产出的特征：

- **糖果色板**（粉、薄荷绿、天蓝、薰衣草紫、桃色、柠檬黄）—— AI 色板的直接映射
- **Nunito + Quicksand 字体**—— 过度使用的 "友好圆体" 组合
- **无处不在的毛玻璃**（`backdrop-blur-sm` + `bg-white/90`）—— 装饰性而非目的性
- **英雄指标卡片模板**（大数字 + 小标签 + 图标）—— 在 8 个页面重复
- **完全一致的卡片网格**—— 相同尺寸、图标 + 标题 + 描述文本， endless repetition
- **所有空状态/错误状态都包在卡片里**—— 包括 404、离线、错误边界
- **所有空状态都居中**—— `items-center justify-center text-center` 模式在 15+ 文件中出现
- **每个空状态都有相同的 `h-16 w-16 rounded-full` 图标容器**—— 15+ 文件完全一致
- **深色模式 = 深紫蓝背景 + 粉色发光装饰**—— 默认暗色模式的典型 AI 套路
- **灰色文字放在彩色/渐变背景上**—— 对比度不足且视觉浑浊

> *frontend-design skill 原文："If you showed this interface to someone and said 'AI made this,' would they believe you immediately? If yes, that's the problem."*

---

## 执行摘要

| 维度 | 评级 | 关键问题数 |
|------|------|-----------|
| AI Slop 反模式 | 🔴 F | 6 Critical + 5 High |
| 可访问性 (A11y) | 🟡 C+ | 0 Critical + 4 High + 8 Medium |
| 主题一致性 | 🔴 D+ | 4 Critical + 1 High |
| 响应式设计 | 🟡 C | 1 Critical + 9 High |

**最严重的前 5 个问题：**

1. **糖果色 AI 色板固化在设计系统**（Critical）— `kw` 色板是 AI 产出的核心指纹，且被硬编码到 Tailwind 配置和 CSS 变量中
2. **毛玻璃效果泛滥**（Critical）— 几乎所有卡片、模态框、浮层都使用 `backdrop-blur`，造成性能开销和可读性下降
3. **英雄指标卡片模板在 8 个页面重复**（Critical）— 完全相同的 `MetricCard` 网格布局，无任何变化
4. **空状态/错误状态视觉模式极端重复**（Critical）— 15+ 文件使用完全相同的 `rounded-full icon + centered text` 模板
5. **粉色品牌色对比度不达标**（High）— `#FF1493` 在白色背景上约 3.65:1，低于 WCAG AA 的 4.5:1 要求

**推荐下一步：**
1. 用 `/distill` 或 `/normalize` 消除 AI Slop 指纹（颜色、字体、卡片滥用）
2. 用 `/harden` 修复可访问性缺陷（对比度、list 语义、aria-pressed）
3. 用 `/adapt` 修复响应式问题（触摸目标、移动端布局）

---

## 按严重程度详细发现

### 🔴 Critical Issues

#### 1. AI 糖果色板固化 — Theming
- **位置**: `tailwind.config.ts` 11–28, `src/themes/kawaii/index.ts`, `src/app/globals.css`
- **严重程度**: Critical
- **类别**: Theming / Anti-Patterns
- **描述**: `kw` (kawaii) 色板定义了粉 (`#FF1493`)、薄荷绿 (`#98FB98`)、天蓝 (`#87CEEB`)、薰衣草 (`#E6E6FA`)、桃色 (`#FFDAB9`)、柠檬黄 (`#FFFACD`) 等颜色。这是 AI 生成界面的典型糖果色指纹。
- **影响**: 界面立即被识别为 AI 产出，品牌辨识度极低，与其他无数模板化仪表盘无法区分。
- **标准**: frontend-design skill — "DON'T: Use the AI color palette"
- **建议**: 替换为更有机的、有品牌意义的色板。考虑使用 OKLCH 色彩空间定义语义化颜色（primary, surface, text, border），并给中性色添加品牌色相的微妙 tint。
- **建议命令**: `/distill` — 剥离到本质，或 `/colorize` — 重新设计色板

#### 2. 毛玻璃效果泛滥 — Anti-Patterns
- **位置**: `src/themes/kawaii/index.ts:88`, `src/shared/ui-primitives/card.tsx:10`, `src/shared/ui-primitives/modal.tsx:121`, `src/app/globals.css` 多处
- **严重程度**: Critical
- **类别**: Anti-Patterns / Performance
- **描述**: `backdrop-blur-sm` 和 `bg-white/90`/`bg-white/70` 被用于卡片基础样式、模态框遮罩、主题系统。毛玻璃不是为特定目的（如突出层级），而是作为默认装饰。
- **影响**: 低端设备上的渲染性能显著下降；可读性受损（半透明背景与底层内容混合）；视觉上显得廉价。
- **标准**: frontend-design skill — "DON'T: Use glassmorphism everywhere"
- **建议**: 移除默认毛玻璃。仅在确实需要区分浮动层级时使用（且应使用实色 + 边框而非模糊）。
- **建议命令**: `/distill`

#### 3. 英雄指标卡片模板重复 — Anti-Patterns
- **位置**: `src/shared/ui-primitives/metric.tsx` + `src/app/tasks/page.tsx:81`, `src/app/settings/page.tsx:188`, `src/app/tokens/page.tsx:274`, `src/app/reviews/page.tsx:218`, `src/app/approvals/page.tsx:224`, `src/app/marketplace/page.tsx:184`, `src/app/spaces/page.tsx:297`, `src/app/page.tsx`
- **严重程度**: Critical
- **类别**: Anti-Patterns
- **描述**: `MetricCard` 组件是精确的"大数字、小标签、图标"模板，在 8 个页面中以完全相同的 `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4` 网格布局重复出现。
- **影响**: 用户疲劳——每个页面顶部看起来一模一样；信息架构扁平化，无法突出真正重要的指标。
- **标准**: frontend-design skill — "DON'T: Use the hero metric layout template"
- **建议**: 只在真正需要突出 KPI 的页面使用指标卡片。其他页面改用更自然的布局（如列表、时间线、或混合布局）。考虑使用不同尺寸和位置的卡片来创造视觉节奏。
- **建议命令**: `/distill`

#### 4. 空状态/错误状态视觉模式极端重复 — Anti-Patterns / A11y
- **位置**: 15+ 文件，见下方列表
- **严重程度**: Critical
- **类别**: Anti-Patterns
- **描述**: 几乎每个空状态、错误状态、404、离线页面都使用完全相同的模板：`mx-auto flex h-16 w-16 ... rounded-full bg-[var(--kw-xxx-surface)]` 图标容器 + `text-center` 标题 + `text-[var(--kw-text-muted)]` 描述。
- **影响**: 极端的视觉单调；用户无法区分不同类型的空状态；界面显得生成感极强。
- **标准**: frontend-design skill — "DON'T: Put large icons with rounded corners above every heading"
- **涉及文件**:
  - `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/offline/page.tsx`
  - `src/app/runs/page.tsx`, `src/app/playbooks/page.tsx`, `src/app/approvals/page.tsx`
  - `src/app/tasks/page.tsx`, `src/app/tokens/page.tsx`, `src/app/assets/page.tsx`
  - `src/app/inbox/page.tsx`, `src/app/reviews/page.tsx`, `src/app/demo/identities/page.tsx`
  - `src/components/forbidden-state.tsx`, `src/components/error-boundary.tsx`, `src/components/route-guard.tsx`
  - `src/interfaces/human/layout/index.tsx`
- **建议**: 为空状态设计差异化的视觉处理。例如：404 可以使用插图或有趣的文案；空列表可以使用行动引导（CTA 按钮）；错误状态可以使用更醒目的警示样式。避免统一的 `rounded-full icon` 模板。
- **建议命令**: `/distill`

#### 5. 语义颜色漂移 — Theming
- **位置**: `src/themes/kawaii/index.ts:30–33` vs `src/app/globals.css`
- **严重程度**: Critical
- **类别**: Theming
- **描述**: TypeScript 主题文件定义 `--kw-success='#90EE90'`, `--kw-warning='#FFD700'`, `--kw-error='#FF6B6B'`, `--kw-info='#87CEFA'`，但 `globals.css` 定义了完全不同的值（`#22c55e`, `#f59e0b`, `#ef4444`, `#3b82f6`）。如果运行时主题加载器应用了 TS 主题，颜色会意外偏移。
- **影响**: 主题系统不可靠；开发者无法确定哪个源是真实的；可能出现运行时颜色突变。
- **建议**: 统一为单一数据源。建议让 `globals.css` 作为唯一真相源，TS 文件仅引用 CSS 变量名而非硬编码值。
- **建议命令**: `/normalize`

#### 6. `bg-white` 硬编码泛滥 — Theming
- **位置**: ~40+ 处，关键文件：`src/interfaces/human/layout/sidebar.tsx` (53, 72, 101), `src/components/header.tsx` (86, 196), `src/app/page.tsx` (197, 251, 272, 290, 321) 等
- **严重程度**: Critical
- **类别**: Theming
- **描述**: 数十个组件直接使用 `bg-white` 而非 `bg-[var(--kw-surface)]`。即使有 `dark:` 覆盖，这也永久锁定了浅色模式为纯白，阻止未来使用米白、暖白或其他浅色主题。
- **影响**: 主题切换系统被架空；无法实现真正的主题定制。
- **建议**: 全局替换 `bg-white` 为 `bg-[var(--kw-surface)]`（或等效设计令牌）。确保 `dark:` 对应项使用 `bg-[var(--kw-dark-surface)]`。
- **建议命令**: `/normalize`

#### 7. 深色模式默认发光装饰 — Anti-Patterns
- **位置**: `src/app/globals.css:63`, `src/app/globals.css:237–245`, `src/app/globals.css:381–385`, `tailwind.config.ts:37`
- **严重程度**: Critical
- **类别**: Anti-Patterns / Theming
- **描述**: 深色模式使用深紫蓝背景 (`#1a1a2e`) 配合粉色发光悬停效果和无限 `pulse-glow` 动画。这是 AI 暗色模式的典型套路。
- **影响**: 视觉上廉价；长时间使用造成视觉疲劳；与项目应有的 "agent server 控制平面" 专业定位不符。
- **标准**: frontend-design skill — "DON'T: Default to dark mode with glowing accents"
- **建议**: 简化深色模式为纯粹的深灰/近黑色 (`#0a0a0a` 或 `#111`)，移除发光动画。使用微妙的高对比度边框区分层级，而非发光阴影。
- **建议命令**: `/distill` 或 `/quieter`

---

### 🟠 High-Severity Issues

#### 8. 粉色品牌色对比度不足 — Accessibility
- **位置**: `src/app/page.tsx:51` (subtitle), `src/app/identities/page.tsx:478`, `src/interfaces/human/layout/sidebar.tsx:119`
- **严重程度**: High
- **类别**: Accessibility
- **描述**:
  - `#FF1493` (~3.65:1 on white) 用于正常文本
  - `#DB7093` (~3.0:1 on white) 用于激活侧边栏链接，背景为 `#FFF0F5` (~2.7:1)
  - `#FF69B4` (~2.7:1 on white) 用于各种文本上下文
- **影响**: 视力较弱或在高光环境下使用的用户难以阅读这些文本。
- **标准**: WCAG 2.1 AA — 1.4.3 Contrast Minimum (4.5:1 for normal text)
- **建议**: 将正常文本的品牌色加深到至少 `#C71585`（或定义 `primary-700`），或仅将亮色品牌色用于大文本（18pt+ / 14pt+ bold）和装饰性元素。
- **建议命令**: `/harden`

#### 9. 列表语义被破坏 — Accessibility
- **位置**: `src/app/tasks/page.tsx:212`, `src/app/runs/page.tsx:279`
- **严重程度**: High
- **类别**: Accessibility
- **描述**: `<div role="list">` 包含 `TaskCard`/`RunCard` 组件。这些卡片传递 `onClick` 给 `Card` 基元，后者内部添加 `role="button"` 和 `tabIndex={0}`。子元素因此渲染为 `role="button"` 而非 `role="listitem"`，屏幕阅读器无法正确宣布列表结构。
- **影响**: 屏幕阅读器用户无法感知列表长度和位置（"第 3 项，共 10 项"）。
- **标准**: WCAG 2.1 A — 1.3.1 Info and Relationships
- **建议**: 在 `Card` 调用外包裹 `<div role="listitem">`，或传递 `role="listitem"` 给 `Card`（它在 `interactiveProps` 之后展开，会覆盖 `role="button"`）。
- **建议命令**: `/harden`

#### 10. 移动端 "More" 对话框缺少焦点陷阱 — Accessibility
- **位置**: `src/components/mobile-nav.tsx:98–148`
- **严重程度**: High
- **类别**: Accessibility
- **描述**: 覆盖菜单使用 `role="dialog"` 但没有使用 `useFocusTrap` 钩子。当对话框打开时，键盘用户可以将焦点 Tab 到其背后的页面内容。也没有 `aria-modal` 属性。
- **影响**: 键盘导航用户在移动视图下会迷失焦点位置；可能触发底层页面的交互。
- **标准**: WCAG 2.1 A — 2.4.3 Focus Order
- **建议**: 使用 `useFocusTrap({ isActive: showMore, onEscape: () => setShowMore(false) })` 包裹对话框内容，并添加 `aria-modal="true"`。
- **建议命令**: `/harden`

#### 11. 触摸目标过小（多处）— Responsive
- **位置**: 多处，详见下表
- **严重程度**: High
- **类别**: Responsive / Accessibility
- **描述**: 多个交互元素的尺寸低于 44×44px 的推荐最小值。

| 文件 | 行 | 元素 | 当前尺寸 |
|------|-----|------|----------|
| `src/interfaces/human/layout/sidebar.tsx` | 101 | 侧边栏折叠按钮 | `h-8 w-8` (32px) |
| `src/components/language-switcher.tsx` | 43 | 语言切换按钮 | `h-9 w-9` (36px) |
| `src/components/theme-toggle.tsx` | 29, 102, 119 | 主题切换按钮 | `h-10 w-10` (40px) |
| `src/components/tablet-sidebar.tsx` | 114 | 平板侧边栏折叠 | `p-2` (~32–36px) |
| `src/components/pwa/pwa-update-prompt.tsx` | 42 | 关闭按钮 | `p-1` (~28px) |
| `src/components/pwa/pwa-install-prompt.tsx` | 100 | 关闭按钮 | `p-1` (~28px) |
| `src/components/notifications.tsx` | 212 | 通知关闭按钮 | `p-1` (~28px) |
| `src/components/create-menu.tsx` | 173 | 下拉菜单关闭按钮 | `p-1` (~28px) |

- **影响**: 移动端用户（尤其是手指较粗或运动障碍者）难以准确点击这些按钮。
- **标准**: WCAG 2.1 AA — 2.5.5 Target Size (推荐 44×44px)
- **建议**: 将图标按钮统一调整为 `min-h-[44px] min-w-[44px]`。可以通过增加内边距或扩大点击区域实现，不一定要改变视觉尺寸。
- **建议命令**: `/adapt` 或 `/harden`

#### 12. 所有内容都包在卡片里 — Anti-Patterns
- **位置**: `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/offline/page.tsx`, `src/app/login/page.tsx`, `src/app/runs/page.tsx`, `src/app/playbooks/page.tsx`, `src/app/approvals/page.tsx`, `src/app/tasks/page.tsx`, `src/app/tokens/page.tsx`, `src/app/reviews/page.tsx`, `src/app/assets/page.tsx`, `src/components/forbidden-state.tsx`, `src/components/error-boundary.tsx`
- **严重程度**: High
- **类别**: Anti-Patterns
- **描述**: 几乎每个状态（空、错误、加载、登录、离线、禁止访问）都被包裹在 `Card` 中。
- **影响**: 卡片失去了其语义意义——当一切都是卡片时，卡片就不再表示"独立的内容单元"。视觉上显得笨重。
- **标准**: frontend-design skill — "DON'T: Wrap everything in cards"
- **建议**: 为全屏状态（登录、404、错误、离线）使用无卡片的居中内容布局。为列表空状态使用内联提示（inline callout）而非浮动卡片。
- **建议命令**: `/distill`

#### 13. 居中一切 — Anti-Patterns
- **位置**: 15+ 文件
- **严重程度**: High
- **类别**: Anti-Patterns
- **描述**: `items-center justify-center` + `text-center` 组合在错误状态、空状态、登录页、首页等大量使用。左对齐文本配合非对称布局更具设计感。
- **影响**: 界面显得模板化、缺乏视觉张力；阅读长文本时居中对齐效率更低。
- **标准**: frontend-design skill — "DON'T: Center everything"
- **建议**: 错误/空状态改为左对齐（或至少文本左对齐、图标居中）。登录页可以保留居中以聚焦注意力，但其他页面应避免。
- **建议命令**: `/distill`

#### 14. 圆角矩形 + 通用阴影 — Anti-Patterns
- **位置**: `tailwind.config.ts:34–38`, `src/themes/kawaii/index.ts:88`, `src/shared/ui-primitives/card.tsx`, `src/app/globals.css:325–347`
- **严重程度**: High
- **类别**: Anti-Patterns
- **描述**: 自定义 `shadow-soft`/`shadow-medium`/`shadow-glow` 被应用到几乎每个卡片。`rounded-3xl` (24px) 被设为卡片默认圆角。
- **影响**: 视觉疲劳；大圆角 + 轻阴影的组合是 AI 生成界面的标志性外观。
- **标准**: frontend-design skill — "DON'T: Use rounded rectangles with generic drop shadows"
- **建议**: 减少默认阴影使用。仅在悬停或需要提升层级时使用微妙阴影。缩小默认圆角到 `rounded-xl` (12px) 或 `rounded-2xl` (16px)，保留 `rounded-3xl` 给特殊强调元素。
- **建议命令**: `/distill`

#### 15. 侧边栏固定宽度挤压平板内容 — Responsive
- **位置**: `src/interfaces/human/layout/sidebar.tsx` (54, 73)
- **严重程度**: High
- **类别**: Responsive
- **描述**: `w-64` (256px) 侧边栏在 768px iPad mini 竖屏上只留下约 512px 内容区，加上 padding 后主内容区域非常狭窄。
- **影响**: 平板上的可用内容区域过窄，可能导致内容截断或布局混乱。
- **建议**: 考虑在平板竖屏上使用 `md:w-64 w-20`（图标-only 模式）或抽屉模式。
- **建议命令**: `/adapt`

#### 16. 按钮尺寸冲突 — Theming
- **位置**: `src/shared/ui-primitives/button.tsx:23–25` vs `src/themes/kawaii/index.ts:81–83`
- **严重程度**: High
- **类别**: Theming
- **描述**: 主题定义声明 `sm: 'min-h-[36px]'`，但实际基元组件覆盖为 `sm: 'min-h-[44px]'`。主题系统无法可靠控制按钮尺寸。
- **影响**: 主题系统被架空；未来调整主题时按钮尺寸不会跟随变化。
- **建议**: 从基元组件中移除硬编码尺寸，完全从主题定义消费。
- **建议命令**: `/normalize`

---

### 🟡 Medium-Severity Issues

#### 17. 装饰性表情符号未对屏幕阅读器隐藏 — Accessibility
- **位置**:
  - `src/app/page.tsx:138` — `🌌` 和 `✨` 在 `<h1>` 内
  - `src/app/reviews/page.tsx:558–563` — 页脚装饰表情
  - `src/app/docs/page.tsx:148,176` — 加载动画表情
  - `src/app/identities/[agentId]/page.tsx:107` — 加载动画表情
  - `src/app/identities/page.tsx:650` — 加载动画表情
  - `src/app/assets/page.tsx:292` — 加载动画表情
  - `src/app/demo/spaces/page.tsx:136` — 聊天头像表情
  - `src/components/global-search.tsx:21–31` — 搜索结果表情
- **严重程度**: Medium
- **类别**: Accessibility
- **描述**: 装饰性表情符号被屏幕阅读器朗读（如"银河"、"闪亮"），在标题和加载状态中增加噪音。
- **标准**: WCAG 2.1 A — 1.1.1 Non-text Content
- **建议**: 为所有装饰性表情添加 `aria-hidden="true"`。如果表情传达意义，使用 `<span role="img" aria-label="描述">`。
- **建议命令**: `/harden`

#### 18. 切换按钮缺少 `aria-pressed` — Accessibility
- **位置**:
  - `src/app/approvals/page.tsx:369–382` — `StatusFilterButton`
  - `src/app/runs/page.tsx:350–355` — `StatusFilterButton`
  - `src/app/playbooks/page.tsx:477–488` — `TaskTypeFilterButton`
  - `src/app/playbooks/page.tsx:503–514` — `TagFilterButton`
- **严重程度**: Medium
- **类别**: Accessibility
- **描述**: 这些按钮充当切换开关（一个被视觉"选中/激活"），但没有向辅助技术传达其按下状态。它们仅依赖颜色变化。
- **标准**: WCAG 2.1 A — 4.1.2 Name, Role, Value
- **建议**: 为每个切换按钮添加 `aria-pressed={active \|\| selected}`。
- **建议命令**: `/harden`

#### 19. 标题层级问题 — Accessibility
- **位置**: 多处
- **严重程度**: Medium
- **类别**: Accessibility
- **描述**: 跳过或孤立的标题层级使页面结构难以导航。

| 文件 | 问题 |
|------|------|
| `src/components/error-boundary.tsx:63` | `h2` 无前置 `h1` |
| `src/app/approvals/page.tsx:140` | 错误状态 `h2` 无 `h1` |
| `src/app/runs/page.tsx:158` | 错误状态 `h2` 无 `h1` |
| `src/components/pwa/pwa-status.tsx:56,141,217` | `h3` 无父级 `h1`/`h2` |
| `src/app/identities/agent-management-card.tsx:109` | `h3` 无保证的父级 `h2` |
| `src/app/identities/dream-policy-card.tsx:14` | `h3` 无保证的父级 `h2` |
| `src/app/identities/session-manager.tsx:86` | `h3` 无保证的父级 `h2` |
| `src/app/identities/workspace-files-manager.tsx:30` | `h3` 无保证的父级 `h2` |
| `src/app/identities/dream-run-list.tsx:18` | `h3` 无保证的父级 `h2` |
| `src/app/identities/[agentId]/workbench-panel.tsx:127` | `h3` 无保证的父级 `h2` |

- **标准**: WCAG 2.1 A — 1.3.1 Info and Relationships
- **建议**: 确保每个页面/错误状态在 `h2` 之前有 `h1`，`h3` 之前有 `h2`。对于可复用的子组件，当无法保证正确层级时，考虑使用 `<p className="text-xs font-semibold uppercase">` 替代标题标签。
- **建议命令**: `/harden`

#### 20. 模态框过度使用 — Anti-Patterns
- **位置**: `src/app/docs/page.tsx`, `src/domains/space/components/create-space-modal.tsx`, `src/app/identities/agent-modal.tsx`, `src/app/demo/identities/page.tsx`, `src/app/tasks/page.tsx`, `src/app/tokens/page.tsx`, `src/app/runs/page.tsx`, `src/app/playbooks/page.tsx`, `src/app/assets/page.tsx`, `src/app/marketplace/page.tsx`, `src/app/spaces/page.tsx`
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: 模态框被广泛用于创建、详情查看等操作。许多可以用内联表单、抽屉或专用页面替代。
- **影响**: 模态框打断用户流程；在移动设备上体验差；层叠模态框时更糟。
- **标准**: frontend-design skill — "DON'T: Use modals unless there's truly no better alternative"
- **建议**: 评估每个模态框是否可以用以下方式替代：
  - 创建操作 → 专用创建页面（如 `/spaces/new`）
  - 详情查看 → 侧边抽屉或详情页
  - 简单确认 → 内联确认或 toast
- **建议命令**: `/distill`

#### 21. 字体选择过于常见 — Anti-Patterns
- **位置**: `package.json` 28–29, `src/app/globals.css` 7–9, 137
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: Nunito + Quicksand 是过度使用的"友好圆体"组合，出现在无数 AI 生成的仪表盘和 SaaS 模板中。
- **影响**: 品牌辨识度低；界面显得模板化。
- **标准**: frontend-design skill — "DON'T: Use overused fonts"
- **建议**: 考虑更有特色的字体配对。例如：一个有衬线的展示字体（如 Source Serif 4、Instrument Serif）搭配一个几何无衬线体（如 Geist、Sora），或选择一个更有个性的现代字体。
- **建议命令**: `/distill` 或 `/normalize`

#### 22. 等宽字体作为技术氛围捷径 — Anti-Patterns
- **位置**: `src/app/settings/page.tsx:379,550,607`, `src/app/tokens/page.tsx:485`, `src/domains/playbook/components/playbook-detail.tsx:103`, `src/app/tasks/page.tsx:425`
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: `font-mono` 被用于会话/账户 ID、API 密钥、剧本正文等，作为"这是技术内容"的视觉暗示。
- **影响**: 等宽字体在小尺寸下可读性较差；不必要的"开发者氛围"标记。
- **标准**: frontend-design skill — "DON'T: Use monospace typography as lazy shorthand for 'technical/developer' vibes"
- **建议**: 仅在真正的代码块（`<pre>` / `<code>`）中使用等宽字体。对于 ID 和密钥，使用常规字体的 `tracking-tight` 或 `font-tabular-nums` 即可。
- **建议命令**: `/distill`

#### 23. 灰色文字在彩色/渐变背景上 — Anti-Patterns
- **位置**: `src/app/approvals/page.tsx:233,248,263`, `src/themes/kawaii/index.ts:93`, `src/shared/ui-primitives/metric.tsx:19,87`
- **严重程度**: Medium
- **类别**: Anti-Patterns / Accessibility
- **描述**: `text-[var(--kw-text-muted)]`（`#6b6b7b`，灰色）被放置在渐变或彩色卡片背景上。`--kw-text-muted` 是字面意义的灰色，不是背景色的 shade。
- **影响**: 视觉上显得浑浊/褪色；对比度可能不足。
- **标准**: frontend-design skill — "DON'T: Use gray text on colored backgrounds"
- **建议**: 在彩色背景上使用背景色的深色 shade 作为文本色，而非灰色。例如，在粉色背景上使用深粉色文本。
- **建议命令**: `/colorize` 或 `/normalize`

#### 24. 单边粗边框 — Anti-Patterns
- **位置**: `src/components/pwa/pwa-update-prompt.tsx:26`
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: `border-l-4 border-l-[var(--kw-primary-500)]` — 圆角元素左侧加粗彩色边框。
- **影响**: 看起来像临时添加的视觉强调，缺乏设计意图。
- **标准**: frontend-design skill — "DON'T: Use rounded elements with thick colored border on one side"
- **建议**: 使用完整的边框、左侧 accent bar（非圆角）、或背景色变化来替代单边粗边框。
- **建议命令**: `/distill`

#### 25. 间距重复无节奏 — Anti-Patterns
- **位置**: 整个代码库
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: `space-y-4`, `gap-4`, `p-4`, `rounded-2xl`/`rounded-3xl` 被重复复制到 15+ 页面文件中，几乎没有变化。
- **影响**: 布局单调；没有通过间距变化创造的视觉节奏。
- **标准**: frontend-design skill — "DON'T: Use the same spacing everywhere"
- **建议**: 引入更有变化的间距节奏。紧密分组 + 宽松分隔。对相关内容使用 `gap-2`/`p-3`，对区块分隔使用 `gap-8`/`py-12`。
- **建议命令**: `/distill`

#### 26. 信息冗余 — Anti-Patterns
- **位置**: `src/app/marketplace/page.tsx:169–181`, `src/app/spaces/page.tsx:282`, `src/app/demo/page.tsx:29–41`, `src/app/login/page.tsx:92–94`
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: 标语 + 标题 + 副标题三层都在描述相同的页面目的。登录页的"Secure Access" pill + "Sign In" 标题 + "Welcome back" 文本 = 三层都在说"登录"。
- **影响**: 用户需要处理重复信息；界面显得冗长。
- **标准**: frontend-design skill — "DON'T: Repeat the same information"
- **建议**: 每层只保留一个。例如登录页只保留 "Sign In" 标题 + 输入框。
- **建议命令**: `/distill` 或 `/clarify`

#### 27. 纯黑/纯白未调色 — Anti-Patterns
- **位置**: `src/app/globals.css:34` (`--kw-surface: #ffffff`), `src/app/globals.css:485–487` (`prefers-contrast: high` 中 `--kw-text: #000000`)
- **严重程度**: Medium
- **类别**: Anti-Patterns
- **描述**: 卡片背景使用纯白色；高对比度模式使用纯黑色。自然界中不存在纯黑纯白。
- **影响**: 屏幕上的纯白色在暗环境中过于刺眼；纯黑色缺乏层次。
- **标准**: frontend-design skill — "DON'T: Use pure black or pure white"
- **建议**: 将 `--kw-surface` 微调为暖白（如 `#FEFDFB`）或冷白（如 `#FAFBFF`）。高对比度模式的黑色也稍微调深灰。
- **建议命令**: `/colorize` 或 `/normalize`

#### 28. 隐藏水平滚动提示 — Responsive
- **位置**: `src/app/identities/[agentId]/page.tsx:166`
- **严重程度**: Medium
- **类别**: Responsive
- **描述**: Tab 栏使用 `overflow-x-auto flex-nowrap` 配合 `scrollbar-hide`。触摸设备用户可能不知道内容可滚动。
- **建议**: 添加渐变遮罩或可见的滚动指示器。
- **建议命令**: `/adapt`

#### 29. Tailwind JIT 色板几乎未使用 — Theming
- **位置**: `tailwind.config.ts:11–28`
- **严重程度**: Medium
- **类别**: Theming
- **描述**: `kw` 配置仅定义了 `primary`, `mint`, `sky` 等。组件几乎全部使用 `var(--kw-*)` CSS 自定义属性。Tailwind JIT 色板几乎从未在 class 名中使用。
- **影响**: 配置冗余；开发者困惑于该用 `bg-kw-primary-500` 还是 `bg-[var(--kw-primary-500)]`。
- **建议**: 要么扩展配置包含语义颜色（启用 `bg-kw-surface`），要么移除未使用的 palette 减少混淆。
- **建议命令**: `/normalize`

#### 30. 无效的 Tailwind 类 `border-3` — Theming
- **位置**: `src/domains/identity/components/identity-card.tsx:50`
- **严重程度**: Medium
- **类别**: Theming
- **描述**: `border-3` 不是标准 Tailwind utility（默认支持 0, 2, 4, 8）。配置未扩展 `borderWidth` 的 `3`。
- **影响**: 该类无效果；可能让开发者困惑为什么边框不显示。
- **建议**: 使用 `border-2` 或在 `tailwind.config.js` 中添加 `3: '3px'`。
- **建议命令**: `/normalize`

#### 31. 高对比度模式不完整 — Theming
- **位置**: `src/app/globals.css:482–496`
- **严重程度**: Medium
- **类别**: Theming
- **描述**: `prefers-contrast: high` 将 `--kw-border` 覆盖为 `#000000`，但没有提供深色模式的高对比度覆盖。在深色模式 + 高对比度下，边框可能不可见或刺眼。
- **建议**: 添加 `.dark` 高对比度覆盖。
- **建议命令**: `/harden`

#### 32. Demo Spaces 页面固定侧边栏 — Responsive
- **位置**: `src/app/demo/spaces/page.tsx:89,112`
- **严重程度**: Medium
- **类别**: Responsive
- **描述**: 使用刚性侧边栏 + 主内容 flex 布局，`w-64` 固定宽度，无响应式堆叠。
- **建议**: 添加 `flex-col md:flex-row` 并在移动端隐藏侧边栏。
- **建议命令**: `/adapt`

---

### 🟢 Low-Severity Issues

#### 33. 硬编码 meta theme-color — Theming
- **位置**: `src/app/layout.tsx:33–34`
- **严重程度**: Low
- **类别**: Theming
- **描述**: `#FFF5F7` 和 `#1A1A2E` 被硬编码为浏览器 chrome 的主题色。它们与当前 token 匹配，但如果 CSS 变量变更不会自动更新。
- **建议**: 通过 `useTheme` 动态注入，或匹配到 `--kw-bg` / `--kw-dark-bg`。
- **建议命令**: `/normalize`

#### 34. 文本截断风险 — Responsive
- **位置**: `src/interfaces/human/layout/sidebar.tsx:87`
- **严重程度**: Low
- **类别**: Responsive
- **描述**: 应用标题在 `overflow-hidden` 容器内使用 `whitespace-nowrap`。如果应用名被翻译成更长字符串或字体增大，文本会被截断且没有省略号。
- **建议**: 添加 `truncate` 或 `text-ellipsis`。
- **建议命令**: `/adapt`

---

## 系统性问题模式

### 模式 1: AI 美学指纹全面渗透
项目 `UI_KAWAII_IMPROVEMENTS.md` 明确记录了这些反模式是" intentional "。但按照现代前端设计标准，这些正是 AI 生成界面的核心指纹：
- 糖果色板 → 6 个文件
- 毛玻璃 → 5+ 文件
- 大圆角 + 阴影 → 全部卡片组件
- Nunito/Quicksand → 全局字体
- 发光动画 → 深色模式

### 模式 2: 空状态模板工业化复制
15+ 文件使用完全相同的视觉模板：
```tsx
<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-xxx-surface)]">
  <Icon />
</div>
<h2 className="... text-center">标题</h2>
<p className="... text-center text-[var(--kw-text-muted)]">描述</p>
```
这种复制粘贴式的一致性不是设计系统——是设计僵化。

### 模式 3: 主题令牌与实现脱节
- TS 主题文件和 CSS 文件定义了不同的语义颜色值
- `bg-white` 硬编码在 40+ 处，架空了 CSS 变量系统
- Tailwind 配置中的 `kw` palette 几乎没有被使用
- 按钮尺寸在主题定义和基元组件中冲突

### 模式 4: 触摸目标系统性不足
8 个图标按钮小于 44×44px，分布在不同的独立组件中。这表明没有全局的交互元素尺寸标准。

---

## 正面发现 (值得保持的做法)

1. **Skip Link**: `src/components/skip-link.tsx` 提供了聚焦时可见的跳转到内容链接
2. **全局焦点指示器**: `globals.css:439–442` 声明了全局 `*:focus-visible` 轮廓，确保没有交互元素完全不可见
3. **模态框可访问性**: `src/shared/ui-primitives/modal.tsx` 实现了焦点陷阱、Escape 处理、`aria-modal`、`aria-labelledby` 和焦点恢复
4. **表单标签自动连接**: `Input`/`Textarea` 基元自动连接 `label htmlFor` + `id`、`aria-describedby` 和 `aria-invalid`
5. **地标元素**: 布局正确使用 `<header>`、`<aside>`、`<nav>` 和 `<main id="main-content">`
6. **下拉菜单焦点陷阱**: `LanguageSwitcher`、`CreateMenu`、`Notifications` 都正确使用 `useFocusTrap` 和 Escape 处理
7. **减少动画**: `globals.css` 尊重 `prefers-reduced-motion` 并禁用动画
8. **头像 alt 文本**: `src/shared/ui-primitives/avatar.tsx` 提供合理的 fallback `alt` 和 `aria-label`
9. **暗色模式覆盖**: 代码库中有 755+ 个 `dark:` 变体，表明暗色模式已被认真考虑
10. **安全区域支持**: 使用 `safe-area-inset-top` 和 `safe-area-pb` 适配刘海屏设备

---

## 按优先级排序的改进建议

### 立即执行 (本周)
1. **修复颜色对比度** — 将粉色文本加深到 `#C71585` 或更暗，确保 WCAG AA 合规
2. **修复列表语义** — 为 `TaskCard`/`RunCard` 添加 `role="listitem"`
3. **同步主题颜色源** — 统一 `themes/kawaii/index.ts` 和 `globals.css` 的语义颜色值
4. **替换 `bg-white` 硬编码** — 全局替换为 `bg-[var(--kw-surface)]`
5. **扩大触摸目标** — 为所有图标按钮添加 `min-h-[44px] min-w-[44px]`

### 短期 (本迭代)
6. 为表情符号添加 `aria-hidden="true"`
7. 为切换按钮添加 `aria-pressed`
8. 修复标题层级问题（确保 `h1` 在 `h2` 之前）
9. 修复移动端 "More" 对话框焦点陷阱
10. 移除默认毛玻璃效果（`backdrop-blur-sm`）

### 中期 (下迭代)
11. 重新设计色板（从糖果色转向有品牌意义的有机色板）
12. 减少卡片滥用（为空状态/错误状态设计差异化处理）
13. 停止居中一切（左对齐文本 + 非对称布局）
14. 评估模态框必要性（替换为专用页面或抽屉）
15. 考虑更换字体（从 Nunito/Quicksand 转向更有特色的配对）

### 长期 (未来规划)
16. 统一 Tailwind 配置与 CSS 变量（选择单一真相源）
17. 为平板优化侧边栏（图标-only 模式或抽屉）
18. 建立间距节奏指南（避免 `gap-4` 无处不在）
19. 移除深色模式发光动画
20. 完善高对比度模式（添加深色模式高对比度覆盖）

---

## 建议的修复命令映射

| 问题类别 | 数量 | 建议命令 |
|----------|------|----------|
| AI Slop 指纹（颜色、字体、卡片滥用、发光装饰） | 15+ | `/distill` — 剥离到本质，去除所有装饰性冗余 |
| 可访问性缺陷（对比度、ARIA、焦点、语义） | 13 | `/harden` — 提高界面的弹性和无障碍性 |
| 主题令牌不一致（颜色漂移、`bg-white`、尺寸冲突） | 6 | `/normalize` — 对齐设计系统，确保一致性 |
| 响应式/移动端问题（触摸目标、平板布局） | 5 | `/adapt` — 适配不同屏幕尺寸和设备 |
| 文案冗余 | 4 | `/clarify` — 精简 UX 文案，消除重复信息 |
| 色板重新设计 | 1 | `/colorize` — 添加战略性的、有意义的色彩 |

**推荐执行顺序：**
1. `/harden` — 先修复可访问性（法律/合规要求）
2. `/normalize` — 统一主题系统（为后续视觉调整打基础）
3. `/distill` — 大规模去除 AI Slop 指纹（最大的视觉提升）
4. `/adapt` — 修复响应式问题
5. `/colorize` / `/clarify` — 最后的润色

---

*报告生成时间: 2026-05-01 08:43 CST*
