# VaultGate 功能与前端打磨后复审

日期：2026-07-14  
基线提交：`e6a3973`（功能与前端打磨）  
审计范围：前端可访问性、响应式、主题、性能、交互鲁棒性、依赖安全与相关 API 查询路径

## 1. Anti-Patterns Verdict

**AI Slop Check：Pass**

当前界面已经形成克制的工业/编辑式控制台语言：以边线、分栏、紧凑列表和状态语义为主，没有渐变标题、玻璃拟态、霓虹暗色、重复卡片矩阵或装饰性图表。Dashboard、Agent 授权工作区和 Audit 移动端事件流均围绕真实运维任务组织，不再是组件库后台模板。

仍可继续收敛的地方是登录/初始化页面仍采用居中表单卡片，但该模式符合短任务认证场景，不作为缺陷。

## 2. Executive Summary

- 总问题：7（Critical 0、High 3、Medium 3、Low 1）
- 综合结论：**Conditional Pass**
- 建议优先级：先修主题 token 和两项 WCAG AA，再处理构建依赖与代理超时。

Top 3：

1. OKLCH Tailwind token 未支持 alpha modifiers，114 处透明度类可能被浏览器丢弃。
2. 手机底部导航文本对比不足，axe 在真实路由状态下报告 WCAG 1.4.3 serious。
3. 文档代码块可横向滚动但不可键盘聚焦，axe 报告 serious。

## 3. Detailed Findings

### HIGH-01：OKLCH token 不支持 Tailwind 透明度修饰符

- **位置**：`apps/control-plane-v3/tailwind.config.js:19`
- **分类**：Theming / Systemic
- **标准**：设计 token 最佳实践
- **描述**：颜色定义为 `oklch(var(--token))`，没有 `/<alpha-value>`。因此 `bg-background/95`、`bg-foreground/45`、`hover:bg-primary/90` 等类生成的声明无效。
- **影响**：源码中存在 114 处带 `/opacity` 的主题类。实测 `.mobile-bottom-nav` 的 `background-color` 为透明；按钮 hover、错误背景、弹窗遮罩、Skeleton 和浅色边框也可能偏离设计。
- **证据**：390px 页面中 `bg-background/95` 计算为 `rgba(0, 0, 0, 0)`。
- **建议**：将所有主题颜色改为 `oklch(var(--token) / <alpha-value>)`；未指定透明度时 Tailwind 会注入 `1`。随后对明暗主题重新跑 axe 和截图回归。
- **建议命令**：`/normalize`、`/colorize`

### HIGH-02：手机底部导航标签颜色对比不足

- **位置**：`apps/control-plane-v3/src/components/app-navigation.tsx:145`
- **分类**：Accessibility / Theming
- **标准**：WCAG 2.1 1.4.3 AA
- **描述**：11.2px 标签使用 `text-muted-foreground`，激活项使用 `text-primary`；导航背景同时因 HIGH-01 透明。
- **影响**：低视力用户和高亮环境下难以辨认关键主导航。axe 在 390px Agent 页面报告 `color-contrast` serious。
- **证据**：实测活动项对背景约 3.75:1，非活动项约 3.22:1，均低于普通文本 4.5:1。
- **建议**：先修 alpha token，再将字号提升到至少 12px，并使用更深的非活动/活动文本 token；以 4.5:1 为验收线。
- **建议命令**：`/adapt`、`/colorize`

### HIGH-03：横向滚动代码块不可键盘聚焦

- **位置**：`apps/control-plane-v3/src/app/docs/docs-content.tsx:68`
- **分类**：Accessibility
- **标准**：WCAG 2.1 2.1.1 / axe `scrollable-region-focusable`
- **描述**：移动端 `<pre>` 使用 `overflow-x-auto`，但没有 `tabIndex="0"`、可访问名称或键盘滚动提示。
- **影响**：只用键盘的用户无法进入并滚动完整 curl 示例。
- **证据**：axe 在 320px 和 390px、明暗主题均报告 serious；768px 以上不触发，因为内容无需滚动。
- **建议**：为 `<pre>` 添加 `tabIndex={0}` 和本地化 `aria-label`，保持可见焦点；补充 axe E2E。
- **建议命令**：`/harden`、`/adapt`

### MEDIUM-01：浏览器 theme-color 仍按 HSL 组装

- **位置**：`apps/control-plane-v3/src/components/theme-provider.tsx:20`
- **分类**：Theming
- **描述**：变量已迁移为 OKLCH channel，但同步逻辑仍写入 `hsl(${channels})`；文档和变量名也仍称 HSL。
- **影响**：浏览器地址栏/系统 UI 无法跟随主题，当前页面也没有静态 `theme-color` meta 作为回退。
- **证据**：所有真实页面查询 `meta[name="theme-color"]` 均为 `null`。
- **建议**：创建 meta（不存在时）并写入 `oklch(${channels})`，同步更新测试和注释。
- **建议命令**：`/normalize`

### MEDIUM-02：Python 开发/构建环境 setuptools 存在已知漏洞

- **位置**：`apps/api/pyproject.toml:32` 和当前 `apps/api/.venv`
- **分类**：Dependency Security
- **标准**：CVE-2026-59890 / PYSEC-2026-3447
- **描述**：本地环境 setuptools 82.0.1，修复版本为 83.0.0。漏洞涉及 macOS NFD 文件名绕过 MANIFEST 排除规则并进入 source distribution。
- **影响**：主要影响源分发构建流程；Linux 生产运行时风险较低，但 CI/开发机若在 macOS 构建 sdist 可能意外打包排除文件。
- **证据**：`pip-audit` 报告 1 个漏洞；生产 npm 依赖为 0 漏洞。
- **建议**：将 build-system 下限提升到 `setuptools>=83.0.0`，更新开发环境和锁定流程，再运行 `pip-audit`。
- **建议命令**：`/harden`

### MEDIUM-03：Next.js API 代理没有上游超时

- **位置**：`apps/control-plane-v3/src/app/api/[...path]/route.ts:67`
- **分类**：Performance / Resilience
- **描述**：浏览器 API client 有 30 秒超时，但 Next.js 到 FastAPI 的 server-side `fetch` 没有 AbortSignal timeout。
- **影响**：当后端建立连接但不返回时，代理请求可能长期占用 Node worker 和连接；浏览器虽会超时，服务器工作仍可能继续。
- **证据**：代理 `fetch` 仅设置 method、headers、body。
- **建议**：添加配置化 `AbortSignal.timeout`，将超时映射为稳定的 504 JSON，并增加代理测试。
- **建议命令**：`/harden`、`/optimize`

### LOW-01：确认弹窗尚未使用新主题系统

- **位置**：`apps/control-plane-v3/src/components/ui/alert-dialog.tsx:21`
- **分类**：Theming / Anti-Pattern
- **描述**：普通 Dialog 已使用主题 overlay 和移动端宽度约束，但 AlertDialog 仍使用 `bg-black/80`、`w-full` 和旧式阴影。
- **影响**：视觉不一致；在极窄视口与暗色主题中遮罩偏重。Radix 焦点和语义本身正常，axe 零违规。
- **建议**：复用 Dialog 的 overlay/surface token 与窄屏宽度规则。
- **建议命令**：`/normalize`、`/polish`

## 4. Positive Findings

- 320、390、768、1440px 的 Dashboard、Secrets、Agent Detail、Audit、Docs 均无整页横向溢出。
- 登录、初始化、编辑 Secret、明文查看、Token 撤销弹窗均通过 axe WCAG A/AA 扫描。
- 明暗主题核心页面除已列问题外均为 axe 零违规。
- 所有主要表单均有显式 Label；按钮与输入触控目标普遍达到 44px。
- Secret reveal 仅在显式打开时请求，30 秒后从状态移除，并有 `Cache-Control: no-store` 后端保障。
- Agent 主从授权从重复六套编辑器收敛为单个选中工作区，显著降低 DOM、请求和页面高度。
- 性能实验（本机、mock API、生产构建）：FCP 84–140ms、LCP 84–224ms、CLS 0；单页 JS 编码传输约 216–238KB。
- `npm audit --omit=dev` 为 0 漏洞；后端 98 tests / 92.59% coverage，前端 68 unit + 15 E2E 全通过。
- 页面风格通过 AI Slop 检查，没有模板化渐变、玻璃、装饰性图表或重复卡片矩阵。

## 5. Scorecard

| 维度 | 评分 | 说明 |
|---|---:|---|
| 功能完整性 | 9.2/10 | Secret、Agent/Token、授权、Audit 与文档闭环完整 |
| 鲁棒性 | 8.8/10 | 核心失败状态清晰；代理缺少 server-side timeout |
| 架构合理性 | 9.0/10 | domain/feature/UI 分层清晰，管理与 Runtime API 分离 |
| 代码整洁度 | 8.7/10 | 一致性明显提升；Agent/Audit 页面仍偏长，可继续拆分 |
| 可访问性 | 8.6/10 | axe 覆盖优秀；仍有两项 serious AA 问题 |
| 响应式 | 9.1/10 | 320–1440px 无溢出，关键桌面模式均做了移动适配 |
| 主题与视觉 | 8.2/10 | 视觉方向成熟，但 alpha token 是系统性配置缺陷 |
| 性能 | 9.0/10 | 无图片负担、CLS 0、首屏快，JS 体积可接受 |
| 测试质量 | 9.1/10 | 单元/E2E/后端覆盖扎实，缺少自动 axe 与主题 token 回归 |
| 依赖安全 | 8.8/10 | npm 清洁；setuptools 存在 1 个可修复构建漏洞 |

**综合评分：8.8/10**

## 6. Action Plan

| 优先级 | 问题 | 建议 | 时间 |
|---|---|---|---|
| Immediate | HIGH-01、HIGH-02、HIGH-03 | 修 alpha token、移动导航对比和可聚焦代码块 | 下一次修复提交 |
| Short-term | MEDIUM-01、MEDIUM-02、MEDIUM-03 | theme-color、setuptools、代理 timeout | 本轮后续 |
| Backlog | LOW-01 | 统一 AlertDialog 主题样式 | 视觉 polish 时 |

修完前三项后，建议将 axe 作为 Playwright 项目的一部分，对 320/390px 与明暗主题做持续回归。
