# VaultGate Control Plane v3 前端 UI 审计报告

> 审计维度：可访问性 (A11y)、性能、主题、响应式、AI Slop / 反模式、UX 文案。
> 基线检查：`npm run check` 通过，`npm run test:unit` 65/65 通过。

---

## 1. 反模式裁决

**AI Slop 检查：部分通过 (Partial)**

已发现的 AI 生成痕迹：

- **大图标圆底空状态**：在 `secrets`、`tokens`、`audit`、`not-found`、`error-boundary`、`route-guard` 的不可用状态均使用 `rounded-full` 大图标容器（`h-12 w-12` 到 `h-20 w-20`）。这是典型的「大图标圆底」反模式。
- **装饰性徽标/胶囊**：`login` 与 `setup` 页面顶部使用 `Shield` 图标 + `VaultGate v1.0` 胶囊徽标，无实际导航作用，纯装饰。
- **卡片内图标标题**：`docs` 页面的 API Reference / Quick Start 卡片在标题旁放置装饰图标。
- **主按钮 Sparkles 图标**：`login` 与 `setup` 的提交按钮使用 `Sparkles` 图标，与严肃的安全工具调性不符。
- **空状态重复模板**：`secrets`、`tokens`、`audit` 的空状态几乎完全相同，仅文案不同。
- **系统字体栈**：`globals.css` 的 `--font-sans` 直接回退到 Inter/Roboto/Arial/系统字体，缺乏品牌辨识度。
- **阴影强度不一致**：虽然 `Card` 默认已改为 `shadow-sm`，但 `route-guard` 的服务不可用卡片仍使用 `shadow-xl`，`dialog` / `alert-dialog` / `dropdown` 仍使用 `shadow-lg`。

---

## 2. 执行摘要

```
Total Issues: 16
  Critical: 1
  High: 5
  Medium: 7
  Low: 3
```

**Top 3 Issues：**

1. **空状态与错误页大量使用「大图标圆底」AI 模板**，降低品牌专业感并造成视觉噪音。
2. **主题色与字体硬编码/过于通用**：`layout.tsx` 中 themeColor 写死 `#ffffff` / `#0f172a`，字体栈使用系统默认，未建立有辨识度的设计系统。
3. **审计页统计卡片重复计算且无 memoization**，每次渲染对 `logs` 数组多次 `filter`，随着日志量增加会明显拖慢页面。

**整体评估：Conditional Pass（有条件通过）**

- 核心功能可访问、类型与测试全绿。
- 主要障碍是视觉同质化与部分装饰性元素，尚未到阻塞发布程度，但需要在正式版前清理。

**建议优先级：**

- 立即：修复 Critical 的路由守卫错误图标与缺失的跳过链接焦点样式依赖。
- 本冲刺：处理 High 的 AI 反模式、硬编码主题值、统计性能问题。
- 下个迭代：中/ Low 的文案精简、组件抽取、响应式微调。

---

## 3. 详细发现

### Critical

#### 1. 路由守卫不可用状态使用加载图标表示错误
- **位置**：`src/components/route-guard.tsx:140`
- **严重级别**：Critical
- **类别**：可访问性 / 语义
- **标准**：WCAG 1.3.1（信息与关系）
- **描述**：服务不可用时使用 `<Loader2 className="h-8 w-8 text-destructive" />` 作为错误状态图标。`Loader2` 是加载语义，用于错误状态会造成屏幕阅读器用户困惑。
- **影响**：错误识别错误，用户可能以为服务仍在加载而非已失败。
- **证据**：`route-guard.tsx:133-149`
- **修复建议**：将图标改为 `AlertTriangle` 或 `XCircle`，并确保有 `aria-hidden`（因为标题已描述错误）。
- **建议命令**：`/harden`

---

### High

#### 2. 空状态与错误页充斥「大图标圆底」反模式
- **位置**：
  - `src/app/secrets/page.tsx:295`
  - `src/app/tokens/page.tsx:272`
  - `src/app/audit/page.tsx:137`
  - `src/app/not-found.tsx:18`
  - `src/components/error-boundary.tsx:49`
  - `src/components/route-guard.tsx:140`
- **严重级别**：High
- **类别**：反模式 / 品牌
- **标准**：frontend-design skill DON'T 指南
- **描述**：所有空状态和错误fallback 都使用 `mx-auto flex h-12/16/20 w-12/16/20 items-center justify-center rounded-full bg-muted` 的模板化视觉。
- **影响**：界面看起来像是 AI 生成模板，削弱 VaultGate 作为安全工具的可信度；多个页面视觉重复。
- **证据**：上述文件均包含几乎一致的图标容器代码。
- **修复建议**：
  - 将空状态抽取为 `<EmptyState>` 组件，提供无图标、小型图标或文字提示等多种变体。
  - 错误页使用简洁文字 + 操作按钮，去掉大圆底图标。
- **建议命令**：`/distill`, `/extract`

#### 3. 登录/初始化页使用装饰性胶囊徽标
- **位置**：`src/app/login/page.tsx:56-61`，`src/app/setup/page.tsx:110-115`
- **严重级别**：High
- **类别**：反模式 / UX 文案
- **标准**：frontend-design skill DON'T 指南（大图标圆底、重复信息）
- **描述**：页面顶部有一个 `rounded-full bg-secondary px-4 py-2` 的胶囊，内含 `Shield` 图标和 `VaultGate v1.0` 文字。该元素不承载导航或状态信息，与下方大标题重复品牌信息。
- **影响**：增加视觉噪音；「v1.0」会随版本发布而过时，形成维护负担。
- **证据**：胶囊文字与大标题 `h1` 都指向 VaultGate。
- **修复建议**：删除该胶囊，或将其替换为更 subtle 的顶部导航/Logo。
- **建议命令**：`/distill`, `/quieter`

#### 4. themeColor 与字体栈硬编码
- **位置**：
  - `src/app/layout.tsx:22-23`（`#ffffff` / `#0f172a`）
  - `src/app/globals.css:109-115`（`--font-sans` / `--font-display` 使用系统字体栈）
- **严重级别**：High
- **类别**：主题 / 设计系统
- **标准**：Best Practice
- **描述**：themeColor 写死十六进制，未随用户切换主题更新；字体栈直接使用 Inter/Roboto/Arial/系统字体，frontend-design skill 明确反对。
- **影响**：主题切换时浏览器 chrome 颜色可能不一致；界面缺乏品牌辨识度。
- **证据**：`layout.tsx` 与 `globals.css` 中的硬编码值。
- **修复建议**：
  - 将 themeColor 改为 `hsl(var(--background))` 或监听主题变化动态设置 meta theme-color。
  - 引入至少一种非系统字体（如 Berkeley Mono、Geist、Commit Mono 或更 distinctive 的显示字体），并配置 next/font。
- **建议命令**：`/normalize`

#### 5. 审计页统计卡片重复过滤，无 memoization
- **位置**：`src/app/audit/page.tsx:108-123`
- **严重级别**：High
- **类别**：性能
- **标准**：Best Practice / React Performance
- **描述**：每次渲染对 `logs` 数组执行三次 `filter` 计算 granted / denied / valueReads 数量。当审计日志增长到数百条时，会在每次状态更新时产生明显计算开销。
- **影响**：页面渲染延迟随数据量线性增长。
- **证据**：
  ```tsx
  {logs.filter((l) => l.granted).length}
  {logs.filter((l) => !l.granted).length}
  {logs.filter((l) => l.action === 'read_value').length}
  ```
- **修复建议**：使用 `useMemo` 一次性计算统计值，或在后端返回聚合数据。
- **建议命令**：`/optimize`

#### 6. 装饰性输入框图标未隐藏于辅助技术
- **位置**：`src/app/login/page.tsx:73,91`；`src/app/setup/page.tsx:125,143,163`
- **严重级别**：High
- **类别**：可访问性
- **标准**：WCAG 1.1.1（非文本内容）
- **描述**：输入框左侧的 `Mail`、`LockKeyhole` 等 Lucide 图标没有 `aria-hidden="true"`，可能被部分屏幕阅读器朗读为「图像」或产生噪音。
- **影响**：辅助技术用户体验受损。
- **证据**：`className="absolute left-3 top-1/2 ..."` 的图标未设置 `aria-hidden`。
- **修复建议**：为这些纯装饰图标添加 `aria-hidden="true"`。
- **建议命令**：`/harden`

---

### Medium

#### 7. `Badge` 使用 `div` 而非 `span`
- **位置**：`src/components/ui/badge.tsx:28`
- **严重级别**：Medium
- **类别**：可访问性 / HTML 语义
- **标准**：HTML Best Practice
- **描述**：`Badge` 渲染为 `<div>`。当 badge 被放置在表格单元格、按钮或段落内部时，会造成非法嵌套（div in phrasing context），并可能被屏幕阅读器识别为块级元素。
- **影响**：HTML 验证失败；语义混乱。
- **证据**：`Badge` 组件源码。
- **修复建议**：将 `<div>` 改为 `<span>`。
- **建议命令**：`/harden`

#### 8. 半透明文字可能低于 AA 对比度
- **位置**：多个文件使用 `text-status-xxx-subtle-foreground/80` 或 `text-muted-foreground/80`
- **严重级别**：Medium
- **类别**：可访问性 / 主题
- **标准**：WCAG 1.4.3（对比度 AA）
- **描述**：subtle-foreground 颜色本身对比度通常刚过 4.5:1，再叠加 `opacity-80` 后会降至 3.5:1 左右，可能不满足 AA。
- **影响**：低视力用户阅读描述文字困难。
- **证据**：`dashboard` ready 卡片、`tokens` created/info 卡片、`audit` info 卡片均使用 `/80` 透明度。
- **修复建议**：去掉透明度，使用不透明的 subtle-foreground；如需层级区分，改用更浅的 subtle 背景或调整字重。
- **建议命令**：`/colorize`, `/harden`

#### 9. 状态提示卡片（info/warning）跨页面重复实现
- **位置**：
  - `src/app/page.tsx:32-44`
  - `src/app/tokens/page.tsx:134-183`
  - `src/app/audit/page.tsx:198-210`
- **严重级别**：Medium
- **类别**：可维护性 / 组件系统
- **标准**：Best Practice
- **描述**：相同的信息/警告卡片结构（圆底图标 + 标题 + 描述）在三个页面重复手写。
- **影响**：样式 drift 风险高；新增变体时需要改多处。
- **证据**：三段代码结构几乎相同。
- **修复建议**：抽取 `<Callout variant="info" | "warning" | "brand">` 组件。
- **建议命令**：`/extract`, `/normalize`

#### 10. `docs` 页面图标与标题组合偏装饰
- **位置**：`src/app/docs/docs-content.tsx:30-31,50-51`
- **严重级别**：Medium
- **类别**：反模式
- **标准**：frontend-design skill DON'T 指南
- **描述**：API Reference 使用 `BookOpen`、Quick Start 使用 `Shield` 图标放在标题旁，且 Quick Start 使用 Shield 与安全主题关联度弱。
- **影响**：增加模板感。
- **修复建议**：去掉标题旁图标，或使用更 subtle 的列表符号；如需图标，应选择与内容语义强相关的图标。
- **建议命令**：`/distill`

#### 11. 主按钮使用 Sparkles 图标
- **位置**：`src/app/login/page.tsx:122`，`src/app/setup/page.tsx:197`
- **严重级别**：Medium
- **类别**：反模式 / 调性
- **标准**：frontend-design skill DON'T 指南
- **描述**：登录与创建管理员账户的提交按钮使用 `Sparkles` 图标，传达「魔法/AI」语义，与安全密钥管理工具的严肃调性不符。
- **影响**：品牌调性混乱。
- **修复建议**：移除图标，或替换为 `ArrowRight`、`Lock` 等语义更合适的图标。
- **建议命令**：`/distill`

#### 12. `Button` loading 状态隐藏原按钮文本
- **位置**：`src/components/ui/button.tsx:63-71`
- **严重级别**：Medium
- **类别**：可访问性
- **标准**：WCAG 4.1.2（名称、角色、值）
- **描述**：`loading` 时直接替换内容为 `<Spinner />`，原按钮文字消失。虽然按钮有 `aria-busy`，但朗读名称会从「Sign In」变为静默或仅读「busy」。
- **影响**：屏幕阅读器用户无法知道按钮原功能。
- **证据**：`button.tsx:63-71`。
- **修复建议**：loading 时保留文本，使用 `aria-disabled` + spinner 与文字并列，或至少保留 `aria-label`。
- **建议命令**：`/harden`

#### 13. `tokens` 页面 API Usage 卡片文案不可复制
- **位置**：`src/app/tokens/page.tsx:360-367`
- **严重级别**：Medium
- **类别**：可用性
- **标准**：Best Practice
- **描述**：curl 命令放在普通 `<p>` 中，用户需要手动选中复制，且内容超出时仅横向滚动。
- **影响**：开发者体验差。
- **修复建议**：使用 `<pre><code>` 包裹，并添加「复制」按钮。
- **建议命令**：`/polish`

---

### Low

#### 14. `route-guard` 服务不可用卡片仍使用 `shadow-xl`
- **位置**：`src/components/route-guard.tsx:139`
- **严重级别**：Low
- **类别**：反模式 / 视觉一致性
- **标准**：frontend-design skill DON'T 指南
- **描述**：虽然 `Card` 默认已改为 `shadow-sm`，但此处手写卡片仍使用 `shadow-xl`，造成投影层级不一致。
- **修复建议**：改用 `Card` 组件或 `shadow-sm`。
- **建议命令**：`/polish`

#### 15. `error.tsx` 错误图标过大且无圆底容器
- **位置**：`src/app/error.tsx:24-26`
- **严重级别**：Low
- **类别**：反模式 / 一致性
- **描述**：`AlertTriangle` 直接渲染为 `h-16 w-16`，没有容器，与空状态/错误边界的大圆底图标风格不一致。
- **修复建议**：与全局错误状态视觉统一，或统一去掉空状态的大图标。
- **建议命令**：`/polish`

#### 16. `logout` 页面错误/加载状态未使用组件且文案缺失结构
- **位置**：`src/app/logout/page.tsx:38-59`
- **严重级别**：Low
- **类别**：可维护性 / 视觉一致性
- **描述**：错误与加载状态使用裸 `div`/`p`，没有复用 `PageLoader` 或 `Card`；错误按钮也未使用 `Button` 组件。
- **修复建议**：复用现有组件保持视觉一致。
- **建议命令**：`/normalize`

---

## 4. 系统性问题

| 模式 | 影响 | 建议 |
|------|------|------|
| 大图标圆底空状态模板在 6+ 处重复 | 品牌同质化、AI 感强 | 抽取 `<EmptyState>` 并默认不带大图标 |
| 信息/警告卡片在 3+ 页面重复 | 维护困难、样式 drift | 抽取 `<Callout>` 组件 |
| 硬编码 themeColor 与系统字体 | 主题不一致、缺乏品牌辨识度 | 使用 CSS token + 自定义字体 |
| 半透明 subtle-foreground | 对比度风险 | 移除透明度，改用不透明颜色 |
| 列表统计无 memoization | 渲染性能随数据线性下降 | `useMemo` 或后端聚合 |

---

## 5. 正面发现

- **跳过主内容链接**：`layout.tsx` 中实现了可见焦点状态的 skip link，符合 WCAG 2.4.1。
- **主题切换无障碍**：`theme-toggle.tsx` 有 `aria-label` 和 `title`，且图标有 `aria-hidden`。
- **表单标签关联**：所有表单输入均使用 `Label htmlFor` + `id` 正确关联。
- **错误提示使用 live region**：登录、设置、令牌等错误消息使用 `role="alert"` 和 `aria-live="polite"`。
- **审计过滤器使用原生 button + aria-pressed**：状态切换对屏幕阅读器友好。
- **动画尊重减弱动效**：`globals.css` 中有 `@media (prefers-reduced-motion: reduce)` 覆盖。
- **高对比度模式支持**：`globals.css` 提供了 `prefers-contrast: high` 回退。
- **单元测试覆盖核心页面**：20 个测试文件、65 个测试全绿，包括可访问性测试。

---

## 6. 行动计划

| 优先级 | 问题 | 建议命令 | 时间线 |
|--------|------|----------|--------|
| Immediate (Critical) | #1 路由守卫错误图标 | `/harden` | 今天 |
| Short-term (High) | #2 大图标圆底反模式 | `/distill`, `/extract` | 本冲刺 |
| Short-term (High) | #3 装饰性胶囊徽标 | `/distill`, `/quieter` | 本冲刺 |
| Short-term (High) | #4 硬编码 themeColor / 字体 | `/normalize` | 本冲刺 |
| Short-term (High) | #5 审计统计 memoization | `/optimize` | 本冲刺 |
| Short-term (High) | #6 装饰图标 aria-hidden | `/harden` | 本冲刺 |
| Medium-term (Medium) | #7-#13 语义、对比度、组件抽取、Sparkles 图标等 | `/harden`, `/colorize`, `/extract`, `/polish` | 下个迭代 |
| Long-term (Low) | #14-#16 视觉一致性收尾 | `/polish`, `/normalize` | Backlog |

---

## 附录：基线检查结果

```bash
$ npm run check   # typecheck + lint + format:check 通过
$ npm run test:unit  # 20 files, 65 tests 全部通过
```
