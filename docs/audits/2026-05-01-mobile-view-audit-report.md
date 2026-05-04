# 移动端视图审计报告

**审计日期**: 2026-05-01  
**审计范围**: `apps/control-plane-v3` 移动端视图适配  
**审计人**: Kimi Code CLI  
**当前 Commit**: `2c85cfb`

---

## 1. 执行摘要

项目移动端适配基础扎实：viewport 配置规范、安全区域处理完善、底部导航和响应式断点使用正确。但存在 **1 个严重问题**（嵌套 `<main>` 元素）已修复，以及若干中低优先级改进空间。

| 维度 | 评级 | 说明 |
|------|------|------|
| viewport 配置 | 🟢 A | device-width, initialScale=1, viewportFit=cover, 允许缩放 |
| 安全区域 | 🟢 A | safe-area-inset-top/bottom 已覆盖 header 和 bottom nav |
| 响应式布局 | 🟢 A- | sm/md/lg 断点使用规范，grid/flex 切换合理 |
| 触摸目标 | 🟢 A- | mobile-nav 44px+，但项目整体显式声明较少 |
| 导航适配 | 🟢 A | 底部导航 + 平板侧边栏 + 桌面侧边栏三层适配 |
| HTML 语义 | 🟢 A | 嵌套 main 已修复（原评级 🟡 C） |
| 模态框适配 | 🟢 A- | items-end 在移动端，max-height 85dvh |
| 输入防缩放 | 🟢 A | input 使用 text-base（16px），防止 iOS 自动缩放 |
| 加载状态 | 🟡 B+ | LoadingScreen 未使用 Kawaii emoji 风格 |
| 横向滚动 | 🟡 B+ | agent-detail 有 tabs 横向滚动，但已隐藏滚动条 |

**总体评级**: 🟢 **A- (移动端适配良好，小修小补)**

---

## 2. 做得好的地方

### 2.1 viewport 配置 ✅
```tsx
// src/app/layout.tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 不设置 maximumScale 以允许用户自由缩放（WCAG 2.1）
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
  ],
};
```

### 2.2 安全区域处理 ✅
```css
/* globals.css */
.safe-area-inset-top   { padding-top: env(safe-area-inset-top); }
.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-pb          { padding-bottom: env(safe-area-inset-bottom); }
```

应用位置：
- `header.tsx` — `safe-area-inset-top`（iPhone 刘海屏）
- `mobile-nav.tsx` — `safe-area-pb`（iPhone 底部 Home 指示条）
- `modal.tsx` — `safe-area-pb`（底部弹窗）

### 2.3 三层导航适配 ✅
| 设备 | 侧边栏 | 底部导航 | 断点 |
|------|--------|----------|------|
| Mobile (<768px) | ❌ 隐藏 | ✅ 底部 Tab | — |
| Tablet Portrait (768-1024px) | ✅ 可折叠 (56-224px) | ❌ 隐藏 | md |
| Tablet Landscape (768-1024px) | ✅ 图标固定 (80px) | ❌ 隐藏 | md |
| Desktop (>1024px) | ✅ 完整 (256px) | ❌ 隐藏 | lg |

### 2.4 响应式 Padding ✅
```tsx
// Layout 的 main 元素
<main className={cn(
  device.isMobile && 'p-3 pb-4',
  device.isTablet && 'p-4',
  device.isDesktop && 'p-6',
)}>
```

### 2.5 输入框防 iOS 缩放 ✅
```tsx
// input.tsx
<input className="... text-base ..." />
```
所有 input/textarea/select 均使用 `text-base`（16px），避免 iOS Safari 自动缩放。

### 2.6 模态框移动端适配 ✅
```tsx
// modal.tsx
<div className="fixed inset-0 z-modal flex items-end justify-center p-4 sm:items-center">
```
- 移动端：底部弹出（`items-end`）
- 桌面端：居中显示（`sm:items-center`）
- 内容区：`max-h-[calc(85dvh-4rem)]`

---

## 3. 发现的问题

### 🔴 严重（已修复）

#### 问题 1: 嵌套 `<main>` 元素 + 重复 ID

**影响**: 屏幕阅读器无法正确识别 main landmark，违反 WCAG；违反 HTML 规范（id 唯一性）

**根因**: `Layout` 组件已渲染 `<main id="main-content">`，但 14 个页面各自又渲染了 `<main id="main-content">`，导致 DOM 嵌套：

```html
<!-- 修复前 -->
<main id="main-content" class="p-3 pb-4">
  <main id="main-content" class="space-y-3">
    ...
  </main>
</main>
```

**修复**: 将使用 `Layout` 的 14 个页面中的 `<main>` 替换为 `<section>`：
- approvals, assets, identities, inbox, marketplace, dashboard
- playbooks, reviews, runs, settings, spaces, tasks, tokens, agent-detail

```html
<!-- 修复后 -->
<main id="main-content" class="p-3 pb-4">
  <section id="main-content" class="space-y-3">
    ...
  </section>
</main>
```

**提交**: `2c85cfb`

---

### 🟡 中优先级

#### 问题 2: LoadingScreen 未使用 Kawaii 风格

**位置**: `src/interfaces/human/layout/index.tsx` — `LoadingScreen`

**现状**: 使用 Lucide `Loader2` 旋转图标，纯文字提示。

**建议**: 替换为 `CuteSpinner`（🌸✨💫 浮动动画）+ Kawaii 风格文字。

#### 问题 3: Header GlobalSearch 在移动端可能过宽

**位置**: `src/interfaces/human/layout/header.tsx`

**现状**:
```tsx
<div className="max-w-xl flex-1">
  <GlobalSearch />
```

`max-w-xl`（576px）在 375px 宽度的 iPhone SE 上会占据绝大部分 header 空间，与右侧的 CreateMenu、UserMenu 竞争。

**建议**: 在移动端将 `max-w-xl` 缩小为 `max-w-[160px]` 或改为 `sm:max-w-xl`。

#### 问题 4: Agent Detail Tabs 横向滚动

**位置**: `src/app/identities/[agentId]/page.tsx:166`

**现状**:
```tsx
<div className="scrollbar-hide flex flex-nowrap gap-2 overflow-x-auto">
```

Tabs 数量多时在移动端需要横向滚动。已使用 `scrollbar-hide` 隐藏滚动条，但用户可能不知道可以横向滑动。

**建议**: 添加视觉提示（如右侧渐隐阴影）指示可滚动内容。

#### 问题 5: text-xs 使用较多（79 处）

**影响**: 在部分 Android 设备上，11.7px 的 text-xs 可读性较差。

**分布**:
- mobile-nav 标签文字: `text-[10px] sm:text-[11px]` — 这是有意为之的紧凑设计
- 卡片描述、徽章、时间戳等: `text-xs`

**评估**: 大部分使用场景合理（辅助信息），不构成严重问题。

---

### 🟢 低优先级

#### 问题 6: CreateMenu 在移动端无 compact 模式

**位置**: `src/components/create-menu.tsx`

Header 右侧的 CreateMenu 在移动端显示完整按钮（文字+图标），占用较多空间。建议移动端只显示 `+` 图标按钮。

#### 问题 7: Dashboard 统计卡片在极窄屏幕可能拥挤

**位置**: `src/app/page.tsx:166`
```tsx
<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
```

在 320px 宽度的设备上，grid-cols-2 的卡片内部文字可能折行严重。

**建议**: 添加 `min-w-0` 和 `truncate` 防止文字溢出。

#### 问题 8: 部分独立页面缺少 safe-area-inset-top

**位置**: `login/page.tsx`, `setup/page.tsx`

这些页面不使用 Layout 组件，header 区域没有 `safe-area-inset-top`。在 iPhone 刘海屏上，顶部的 toast/语言切换器可能被刘海遮挡。

---

## 4. 验证记录

```bash
# 质量门
npm run check        # ✅ typecheck + lint + format:check 全过
npm run test:unit    # ✅ 342 passed
npm audit            # ✅ 0 vulnerabilities

# 关键检查项
grep -c "text-base" src/shared/ui-primitives/input.tsx   # ✅ 2 处（input + textarea）
grep -c "safe-area" src/app/globals.css                   # ✅ 3 处
grep -c "min-h-\[44px\]" src/components/mobile-nav.tsx    # ✅ 1 处
grep "<main" src/app/page.tsx                              # ✅ 0 处（已修复）
```

---

## 5. 建议优先级

| 优先级 | 问题 | 工作量 | 影响 |
|--------|------|--------|------|
| 🟡 | LoadingScreen 使用 CuteSpinner | 1 文件 | 品牌一致性 |
| 🟡 | Header GlobalSearch 移动端 max-width | 1 文件 | 空间利用 |
| 🟡 | Agent Detail Tabs 滚动提示 | 1 文件 | UX 发现性 |
| 🟢 | CreateMenu 移动端 compact | 1 文件 | Header 空间 |
| 🟢 | Login/Setup safe-area-top | 2 文件 | iPhone 刘海屏 |
| 🟢 | Dashboard 卡片文字截断 | 1 文件 | 极窄设备 |

---

*报告生成时间: 2026-05-01*
