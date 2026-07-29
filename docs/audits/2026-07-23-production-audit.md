# VaultGate 项目与生产部署全面审计（初审 2026-07-23，复审至 2026-07-29）

## 0. 管理员改密功能部署复审（2026-07-29）

**当前总评：9.3 / 10，Pass。** `PATCH /api/admin/password`、安全设置页、设置导航、改密审计和
全 Session 撤销已在提交 `7a4e533` 实现并部署至 `https://ashare.infinitas.fun`。Coolify 部署
`hzse9ya99hr23ab5xkvxiifd` 状态为 `finished`；Web、API、PostgreSQL 均运行镜像
`7a4e533bc1ef46b46ea5e55994b9f4ba289f8ce4` 且持续 `healthy`。公网 `/healthz`、`/readyz` 和
`/settings/security` 分别通过健康、数据库/加密就绪和新路由检查。

| 维度 | 权重 | 当前评分 | 证据与结论 |
|---|---:|---:|---|
| 安全与隐私 | 20% | 9.4 | Session-only、CSRF、密码策略、422 脱敏、全会话撤销和审计闭环；生产依赖 0 漏洞 |
| 架构与代码质量 | 15% | 9.2 | 复用后端/前端密码策略，认证、审计与设置导航边界清晰；无新增迁移或隐式凭据状态 |
| 测试与可靠性 | 15% | 9.2 | 新 API 23 项、ops 96 项、前端 127 项、三浏览器 78 项及生产镜像 21 项通过；本机全量 pytest runner 有 PTY 阻塞 |
| UI/UX 与可访问性 | 15% | 9.4 | 安全页字段级错误、可见性按钮、加载态和重新登录闭环；六个关键页 axe A/AA 三浏览器通过 |
| 性能与资源效率 | 10% | 9.2 | 部署后桌面/移动 CWV 预算通过；仍缺 RUM、长时间 soak 与峰值写负载 |
| 部署、运维与恢复 | 15% | 9.4 | 精确 UUID 部署、镜像提交和三容器健康交叉验证；异机备份/恢复基线延续通过 |
| 文档与开发体验 | 10% | 9.1 | OpenAPI 类型、双语文案、测试和审计同步；Coolify 大响应 wrapper 仍有解析缺陷 |
| **加权总分** | **100%** | **9.3** | **功能已发布，当前无 Critical/High 发布阻塞项** |

### 0.1 新接口与行为审计

- **认证边界**：只接受 Admin Session；Management Token 调用返回 400，匿名访问仍由统一
  principal 依赖拒绝。密码修改不会隐式撤销 Management Token。
- **密码安全**：当前密码通过 bcrypt 验证；新密码与 bootstrap 共用至少 12 字符、大小写、
  数字、特殊字符和最多 72 UTF-8 字节规则；新旧相同返回 409。
- **会话与原子性**：更新 bcrypt hash、撤销该用户全部未撤销 Session、写入成功审计并提交，
  随后删除当前 Cookie；错误当前密码和复用只写 denied 审计，不撤销会话。
- **敏感输入**：验证异常处理器由精确字段名扩展到含 `password`/`secret`/`token` 的字段，
  `current_password` 和 `new_password` 的 422 均不回显 `input`。
- **用户体验**：`/settings/security` 提供当前/新/确认密码、Eye/EyeOff 控件、字段级
  `aria-invalid`/`aria-describedby`、提交锁定和一次性登录成功提示；设置页使用共享子导航。
- **存储退化**：浏览器禁用 `sessionStorage` 时只丢失一次性提示，不会把已成功改密误报为
  服务端失败，也不会阻止重新登录。

### 0.2 验证证据

- mypy 51 文件、Ruff、迁移策略、ESLint、Prettier、TypeScript、OpenAPI 类型漂移和生产构建
  均通过；Compose 展开正常；Bandit 为 0 Medium/High。
- 新后端文件 **23 passed**；ops **96 passed**；前端 **34 files / 127 passed**，安全页行覆盖率
  `93.33%`；本地三浏览器 **78 passed**，部署域名三浏览器 **78 passed**。
- 当前生产 API 镜像配合隔离 tmpfs PostgreSQL 执行 **21/21**：双 Session、Management Token、
  CSRF、400/409/422、验证脱敏、错误后会话存活、204、全 Session 撤销、旧/新密码、Token 保留、
  success/denied 审计和清理全部通过；生产数据库未连接或修改，临时容器/网络清理为 0。
- 部署后 CWV：桌面 TTFB `295.1ms`、FCP `412ms`、LCP `860ms`、CLS `0`、INP `32ms`；
  Pixel 7 TTFB `275.1ms`、FCP/LCP `404ms`、CLS `0`、INP `16ms`，均在预算内。
- Python lock 的 pip-audit 为 0；npm 生产依赖为 0。完整开发树只命中精确公告
  `GHSA-mh99-v99m-4gvg`，与仓库唯一 allowlist 一致，仍作为 Medium 供应链风险持续跟踪。

### 0.3 当前剩余风险

当前风险为 Critical 0、High 0、Medium 5、Low 2：

1. **Medium：开发依赖公告**。仅开发期 glob/ESLint/OpenAPI 工具链命中
   `GHSA-mh99-v99m-4gvg`；强制修复会降级到不兼容主版本，生产树不受影响。
2. **Medium：性能证据边界**。已有 CWV 与短负载，但没有 RUM、长时间 soak、峰值写负载和
   PostgreSQL 容量曲线。
3. **Medium：Coolify wrapper**。`deployments wait` 仍会对大型日志触发
   `jq: Argument list too long`；本轮以精确部署日志、公网端点和容器镜像/健康交叉验证。
4. **Medium：容量监控**。生产主机和异机备份仓库需要持续 85%/92% 分级告警及月度恢复演练。
5. **Medium：本地 pytest runner**。本机受管 PTY 在整文件/全量 TestClient 收集时会等待；精确
   node-id 可通过，但本轮未重新宣称全量 API+ops 覆盖率。应以 CI Python 3.12 非 PTY 门禁复核。
6. **Low：样式属性 CSP**。脚本 nonce 策略已严格，React 动态样式仍需
   `style-src-attr 'unsafe-inline'` 兼容。
7. **Low：人工可访问性**。axe 自动检查通过，不替代 VoiceOver/NVDA、200% 缩放和纯键盘人工验收。

## 0.4 生产复验更新（2026-07-28）

**当前状态：Pass。** 管理员密码已通过隐藏输入完成轮换，生产库 bcrypt 格式、真实公网登录、
退出和验证会话撤销均已通过。此前 `H-20260727-01` 管理员弱密码风险关闭。密码轮换后重新执行
三浏览器 69 项、真实生产 API 36 项、Core Web Vitals 和 100 请求/10 并发稳定性测试，全部
通过；临时业务对象清理为 0，API/Web 错误日志匹配数为 0。完整证据见
`docs/audits/2026-07-28-production-functional-acceptance.md`。下文 2026-07-27 及更早的分数和风险
清单保留为历史快照，不代表 2026-07-28 的当前发布状态。

## 1. 二次复审结论（2026-07-27）

**当前总评：9.0 / 10，条件通过（Conditional Pass）。**

本轮按 7 月 24 日复审的剩余问题逐项修复，并对当前源代码、Docker 合成栈、生产基础设施和
`https://ashare.infinitas.fun` 重新取证。Coolify 资源 `vaultgate`（UUID
`tr01vb13cz2sj4wrm4y009cr`）现运行提交 `f2313ce`，API、Web、PostgreSQL 三个容器均为
`healthy`。管理员邮箱为 `tdcasual@outlook.com`，已按用户指定凭据完成真实登录和完整业务
流验收；凭据、Token、数据库密码、加密密钥和备份密码均不记录在仓库或本报告中。

本轮共保留 **7 项当前风险**：Critical 0、High 1、Medium 4、Low 2。High 项是用户指定的
管理员密码低于项目自身首次初始化强度策略，因此不能给出无条件生产放行结论。

| 维度 | 权重 | 二次复审评分 | 证据与结论 |
|---|---:|---:|---|
| 安全与隐私 | 20% | 8.2 | 生产依赖 0、nonce CSP 与权限边界通过；管理员密码强度是主要残余风险 |
| 架构与代码质量 | 15% | 9.0 | API/Web/数据库边界清晰，动态 CSP、备份和负载工具均有契约测试 |
| 测试与可靠性 | 15% | 9.5 | Python/ops 235 项、前端 116 项、三浏览器 69 项、真实合成业务流均通过 |
| UI/UX 与可访问性 | 15% | 9.2 | Chromium、Pixel 7、WebKit 对五个关键页面的 axe A/AA 扫描均通过 |
| 性能与资源效率 | 10% | 9.1 | 本地和线上 CWV 均在预算内，线上 100 请求/10 并发失败为 0 |
| 部署、运维与恢复 | 15% | 9.4 | 加密异机备份、定时器、真实快照及隔离恢复演练均已闭环 |
| 文档与开发体验 | 10% | 9.1 | CI、恢复、部署、安全和耐久性文档已同步；Coolify wrapper 仍有工具缺陷 |
| **加权总分** | **100%** | **9.0** | **核心发布门禁全部闭环；需接受或修正管理员弱密码风险** |

### 1.1 已关闭问题与验证证据

- **依赖安全**：GitHub Dependabot 开放告警为 0；`npm audit --omit=dev` 为 0。完整开发树
  仅允许精确公告 `GHSA-mh99-v99m-4gvg`，位于 ESLint 的开发期 glob 工具链；门禁在出现
  第二条公告或任何生产漏洞时立即失败。
- **浏览器 CSP**：Next.js proxy 每请求生成 nonce，框架脚本与主题初始化脚本均携带 nonce；
  `script-src` 不含 `unsafe-inline`，包含 `strict-dynamic`。Sonner 的固定运行时样式只通过两个
  精确 SHA-256 哈希授权；`object-src 'none'`、`frame-ancestors 'none'` 和 HTTPS 请求升级均在线
  上响应中核实。
- **浏览器与可访问性**：本地及部署域名各执行 69 项 Playwright，覆盖 Desktop Chromium、
  Pixel 7 Mobile Chrome 和 Desktop Safari/WebKit；`/`、`/agents`、`/secrets`、`/audit`、
  `/settings/management-tokens` 的 axe WCAG A/AA 自动扫描均无违规。
- **后端与前端门禁**：Python/API/ops `235 passed`，覆盖率 `90.91%`；前端 `116 passed`，
  类型检查、ESLint、Prettier 和 Next.js 生产构建均通过。
- **真实合成栈**：API、Web、PostgreSQL 的真实 Docker 构建、迁移、健康检查和凭据生命周期
  `1 passed`；合成负载 100 请求、10 并发、失败 0、P95 `161.5ms`，所有临时容器、网络和
  数据卷已清理。
- **本地性能**：桌面 FCP `120ms`、LCP `276ms`、CLS `0`、INP `24ms`、TTFB `23.8ms`；
  移动 FCP/LCP `100ms`、CLS `0`、INP `16ms`、TTFB `16.2ms`。
- **线上性能**：桌面 FCP `644ms`、LCP `1116ms`、CLS `0`、INP `16ms`、TTFB `262.5ms`；
  移动 FCP/LCP `668ms`、CLS `0`、INP `16ms`、TTFB `522.5ms`。线上负载 100 请求、10
  并发、失败 0、P50 `113.8ms`、P95 `422.2ms`、P99 `467.5ms`。
- **生产业务流**：bootstrap 已关闭；管理员登录/退出、Management Token 创建/轮换/吊销、
  Secret 加密创建/授权读取/删除、Agent 创建/更新/禁用、Agent Token 签发/授权/越权拒绝/
  吊销，以及成功和拒绝审计记录均通过。临时 Token 与 Secret 已删除，旧管理员会话已撤销。
- **异机加密备份**：生产源 `green-jp` 每日 `04:00 UTC` 生成 PostgreSQL custom-format dump，
  经 `pg_restore -l` 校验后写入 `hw-sg` 的 forced-SFTP restic 仓库；定时器为
  `enabled/active`，最近服务结果为 success，仓库和恢复密钥均为专用、root-only 配置。
- **隔离恢复演练**：最新异机快照恢复到 tmpfs 上的临时 PostgreSQL 16 容器，结果为
  `tables=10 migrations=1`；容器、dump、瞬态 systemd 服务和运行期密码均在退出后清理。
- **部署闭环**：首次部署暴露 Coolify 4.1.2 不展开 `traefik.docker.network` 标签变量的问题，
  产生 504；改为精确资源网络后重新部署，最终三个镜像均对应 `f2313ce`，公网 `/healthz` 和
  `/readyz` 均恢复 200，随后完成上述部署版浏览器、性能、负载和业务流测试。

### 1.2 当前风险与后续动作

#### H-20260727-01 管理员密码低于项目 bootstrap 强度策略

- **类别**：认证安全
- **证据**：用户指定密码可登录，但长度与字符组合低于 `BootstrapRequest` 要求的至少 12 位、
  同时包含大小写、数字和特殊字符；本次通过定向 bcrypt 重置满足了用户明确要求。
- **影响**：互联网登录入口更易受凭据填充、重用密码泄露和离线猜测影响；IP/账号限流只能
  降低在线尝试速率，不能替代强密码。
- **建议**：尽快轮换为随机生成的 16 位以上密码，并通过密码管理器保存；在加入正式密码
  修改接口前，不应把数据库定向重置作为日常操作路径。

#### M-20260727-01 开发工具链存在一条临时允许的 High 公告

- **类别**：供应链
- **证据**：`GHSA-mh99-v99m-4gvg` 仅经 ESLint 插件的开发依赖到达，生产树为 0；强制覆盖
  会破坏上游仍使用的旧 CommonJS API。
- **建议**：持续跟踪上游兼容版本；精确 allowlist 不得扩展为按包名或严重度宽泛忽略。

#### M-20260727-02 性能证据仍是实验室和短负载基线

- **类别**：性能 / 容量
- **证据**：已有 Playwright CWV 和 100 请求/10 并发冒烟，但没有真实用户 RUM、长时间 soak、
  峰值写负载或数据库容量曲线。
- **建议**：接入匿名 RUM 分位数与服务端 RED 指标；发布高流量功能前增加 15-30 分钟受控压测。

#### M-20260727-03 Coolify wrapper 大型 Compose 解析缺陷

- **类别**：运维工具
- **证据**：`status`、`deploy --wait` 最终回执和 `deployments find` 可触发
  `jq: Argument list too long`；完整应用响应还可能含未递归脱敏的 Compose 环境值。
- **建议**：wrapper 改为流式 JSON/递归脱敏后再恢复统一状态接口；修复前只使用精确资源解析、
  部署触发、宿主机非敏感容器字段和公网行为交叉验证。

#### M-20260727-04 主机与仓库容量需要持续监控

- **类别**：运维 / 数据耐久性
- **证据**：源机磁盘使用约 85%，异机目标可用空间约 25GB；当前保留策略可用但余量不是无限。
- **建议**：设置 85%/92% 告警和仓库容量趋势，至少每月执行一次同样的隔离恢复演练。

#### L-20260727-01 样式属性仍需受控 `unsafe-inline`

- **类别**：浏览器安全兼容
- **证据**：`script-src` 已完全移除 `unsafe-inline`；React 组件样式属性仅由
  `style-src-attr 'unsafe-inline'` 兼容，样式元素仍要求 nonce 或精确哈希。
- **建议**：逐步将动态尺寸迁移为 CSS 变量/类名后评估移除此指令，不应把它扩大到脚本或
  `style-src`。

#### L-20260727-02 测试依赖存在待处理弃用警告

- **类别**：开发体验
- **证据**：Python 235 项通过，但 Starlette TestClient 对按请求设置 cookie 产生 14 条弃用警告。
- **建议**：在下一次 httpx/Starlette 升级前把 cookie 设置迁移到 client 实例，保持 CI 零警告。

### 1.3 界面审计结论

- **AI 模板化反模式：通过**。未发现紫蓝渐变、装饰性玻璃态、嵌套卡片、指标英雄区、通篇
  居中或无意义图标网格；界面保持适合密钥运维控制台的克制、密集和可扫描风格。
- **响应式：通过自动门禁**。移动项目保留关键操作，无横向溢出回归；固定格式控件和导航在
  Pixel 7 视口稳定。
- **可访问性边界**：axe A/AA 全通过不等于人工读屏认证；正式合规审查仍应加入 VoiceOver/
  NVDA、200% 缩放和纯键盘人工脚本。

## 2. 复审结论（2026-07-24）

**当前总评：8.4 / 10，条件通过（Conditional Pass）。**

本次复审覆盖源代码、依赖、容器配置、自动化测试、Coolify 资源和真实公网业务流。生产资源
`vaultgate`（UUID `tr01vb13cz2sj4wrm4y009cr`）运行在提交 `b7e623c`，状态为
`running:healthy`。管理员已建立（邮箱为 `tdcasual@outlook.com`；凭据不在此报告中）。

| 维度 | 权重 | 复审评分 | 证据与结论 |
|---|---:|---:|---|
| 安全与隐私 | 20% | 8.5 | 依赖、敏感输入回显、加密 round-trip 和限流注入已修复；CSP 仍含 `unsafe-inline` |
| 架构与代码质量 | 15% | 8.7 | 模块边界、类型、配置契约和容器隔离稳定；仍有少量平台语义约束 |
| 测试与可靠性 | 15% | 9.0 | 后端与 ops 229 项、前端 112 项、Docker/Playwright 1 项均通过；线上核心业务流闭环 |
| UI/UX 与可访问性 | 15% | 8.3 | 桌面/移动无溢出，触控目标和标题层级已修复；尚未建立完整 axe/WebKit 门禁 |
| 性能与资源效率 | 10% | 7.8 | 构建和公网响应稳定；尚无真实用户 CWV 与压力基线 |
| 部署、运维与恢复 | 15% | 8.0 | Coolify 健康、持久备份卷和每日任务已验证；尚无异机备份与恢复演练 |
| 文档与开发体验 | 10% | 8.2 | 部署指南已同步实际任务限制；仍需等待 GitHub Dependabot 结果刷新 |
| **加权总分** | **100%** | **8.4** | **条件通过，数据恢复能力完成异机化后可无条件放行** |

### 已完成的发布门禁

- 本地 `npm audit`（生产与完整依赖）均为 **0 vulnerabilities**；Next.js 已为 `16.2.11`，sharp 已为 `0.35.3`，js-yaml 也已覆盖修复。
- 422 敏感字段不再回显原始输入；`/readyz` 已验证 encrypt/decrypt round-trip；全局 IP 限流变量已透传到生产 Compose；Python 开发锁已完整哈希化。
- 后端与 ops 测试 **229 passed**、覆盖率 **80.34%**；控制台测试 **112 passed**；Docker 合成栈 Playwright **1 passed**。
- 线上 API 已实测登录/退出、Management Token 创建/轮换/吊销、Secret 加密读写/删除、Agent 创建/更新/禁用、Agent Token 授权/越权拒绝/吊销，以及审计成功/拒绝记录。
- 线上浏览器已实测 `/`、`/agents`、`/secrets`、`/audit`、`/settings/management-tokens`；认证态错误为 0，桌面与移动端无横向溢出，移动按钮最小尺寸为 44px，退出可回到登录页。
- PostgreSQL 使用独立 `postgres-backups` 持久卷；Coolify scheduled task `vaultgate-postgres-backup` 已启用，频率为每日 `17 3 * * *`（03:17 UTC），命令包含 `umask 077`、`pg_restore -l` 可读性校验和 30 天清理。更新前已有 28 次连续成功执行；新命令将在下一次每日运行时产生第一条带 restore-list 校验的执行记录。

### 剩余风险与边界

1. 备份目前仍在同一 Coolify 主机的独立卷中，尚未建立异机/对象存储副本，也未完成隔离恢复演练；因此数据耐久性仍是唯一上线条件。
2. Coolify wrapper 对大型 Compose 响应存在 `jq: Argument list too long` 缺陷，本报告使用资源解析、任务 API、公开 HTTP 和部署回执取证，未抓取含未脱敏环境变量的完整响应。
3. GitHub 推送时曾显示 2 个 Dependabot High 提示，本地 npm 审计已为 0；GitHub 扫描结果属于异步状态，需待平台刷新后再核对。
4. CSP 的 `unsafe-inline`、完整浏览器/A11y 矩阵、真实用户 CWV/压力测试仍是中期改进项，不阻断当前核心业务验收。

## 3. 初审结论（2026-07-23）

**总评：7.2 / 10，条件不通过（Conditional Fail）**。

VaultGate 的模块边界、类型检查、鉴权隔离、加密设计、容器化与前端基础质量整体良好；生产站点 `https://ashare.infinitas.fun` 当前可访问，Coolify 资源健康，TLS、未授权边界、CORS、HTTP 跳转和首屏响应均通过实测。

当前不建议无条件生产放行，原因不是服务不可用，而是存在两项高风险发布门禁：生产依赖有 2 个 High 漏洞；数据库已有持久卷但尚无可核实的备份计划或恢复演练证据。管理员尚未创建，用户提供的账号信息不符合服务端邮箱与密码策略，因此登录后的完整生产业务流尚未执行。

### 评分口径

| 维度 | 权重 | 评分 | 结论 |
|---|---:|---:|---|
| 安全与隐私 | 20% | 6.8 | 核心边界设计较强，但依赖漏洞、敏感校验回显和 CSP 降低生产可信度 |
| 架构与代码质量 | 15% | 8.3 | 模块边界、契约、类型和错误模型成熟；少量配置与实现语义漂移 |
| 测试与可靠性 | 15% | 6.9 | 前端与 ops 测试通过；后端完整 pytest 和线上登录后流程未闭环 |
| UI/UX 与可访问性 | 15% | 7.4 | 响应式、主题和基本触控尺寸良好；有标题层级和局部触控目标问题 |
| 性能与资源效率 | 10% | 7.8 | 线上首屏响应稳定、构建正常；尚无真实用户 Core Web Vitals 与负载基线 |
| 部署、运维与恢复 | 15% | 6.2 | Coolify 与健康探针正常；备份、持续清理和监控证据不足 |
| 文档与开发体验 | 10% | 7.5 | 指南和历史审计较完整；当前工作树与线上提交存在未发布漂移 |
| **加权总分** | **100%** | **7.2** | **条件不通过** |

审计对象分为两层：线上运行提交为 `df85da1`；本地 `main` 的 HEAD 与其相同，但工作树另有未提交改动。本报告对线上行为与当前工作树分别取证，不把本地未提交功能误认为已部署。

## 4. 初审发布门禁与重点发现

共记录 **12 项**：Critical 0、High 2、Medium 7、Low 3。

### H-01 生产前端依赖存在 2 个 High 漏洞

- **位置**：`apps/control-plane-v3/package.json:38`、`apps/control-plane-v3/package-lock.json:20`
- **类别**：供应链安全
- **证据**：`npm audit --omit=dev` 报告 Next.js `16.2.10` 与 sharp `0.34.5` 共 2 个 High；Next.js 修复版本至少为 `16.2.11`，sharp 修复线为 `0.35.0`。
- **影响**：公告覆盖中间件绕过、请求缓存混淆、Server Action/rewrites/图像处理等攻击面。项目未使用其中部分能力会降低可利用性，但不能消除已知漏洞门禁。
- **建议**：升级并重新锁定 Next.js/sharp，重新运行单测、构建、`npm audit` 与线上回归。

### H-02 无法证明生产数据库具备可恢复备份

- **位置**：Coolify 资源 `vaultgate`；`docs/guides/data-durability.md`
- **类别**：数据耐久性 / 灾难恢复
- **证据**：Coolify 中可见 PostgreSQL 持久卷，但 scheduled tasks 为空，资源不是独立 Coolify Database，未发现数据库备份计划、PITR、外部快照或最近恢复演练记录。
- **影响**：宿主机、卷、误操作或数据库损坏时，RPO/RTO 无法证明；对密钥保管系统属于高风险。
- **建议**：建立加密异机备份，明确保留期与 RPO/RTO，每月至少执行一次隔离恢复演练并保存校验记录。

### M-01 Pydantic 422 错误会回显密码输入

- **位置**：`apps/api/app/modules/admin_auth/schemas.py:16`
- **类别**：敏感数据处理
- **证据**：线上向 bootstrap 提交不合规信息时，FastAPI 422 的 `detail[].input` 包含原始 password 输入。
- **影响**：响应可能进入浏览器诊断、反向代理或 APM 日志，扩大凭据暴露面。
- **建议**：增加统一校验异常处理器，对 `password`、`token`、`secret` 等字段移除或替换 `input`，并加入 API 回归测试。

### M-02 readiness 所称的加密 round-trip 实际只加密不解密

- **位置**：`apps/api/app/factory.py:145`、`docs/guides/monitoring.md:24`
- **类别**：可靠性 / 监控准确性
- **证据**：`svc.encrypt("healthcheck")` 后直接报告 `encryption=ok`，未调用 decrypt。
- **影响**：加密可用但解密链路、密钥选择或信封解析异常时，`/readyz` 仍可能为绿色。
- **建议**：对临时明文执行 encrypt/decrypt 并验证相等；监控文档与实现统一。

### M-03 新增全局 IP 限流配置未注入生产 Compose

- **位置**：`apps/api/app/config.py:61`、`apps/api/app/modules/admin_auth/routes.py:85`、`docker-compose.coolify.yml:104`、`docker-compose.prod.yml:100`
- **类别**：配置一致性
- **证据**：本地未提交代码和 env 示例已有 `AUTH_RATE_LIMIT_IP_MAX_ATTEMPTS`，三个生产 Compose 均未传递该变量。
- **影响**：该本地改动发布后，即使运维设置环境变量，容器仍使用应用默认值，造成误配置。
- **建议**：发布前在三种生产 Compose 中显式透传，并增加配置契约测试。此问题当前属于工作树发布风险，不应表述为线上已生效配置。

### M-04 生产 CSP 允许 inline script/style

- **位置**：`apps/control-plane-v3/next.config.mjs:20`
- **类别**：浏览器安全
- **证据**：线上响应为 `script-src 'self' 'unsafe-inline'`、`style-src 'self' 'unsafe-inline'`。
- **影响**：一旦出现 HTML/脚本注入，CSP 的纵深防御能力明显下降。
- **建议**：评估 Next.js nonce/hash CSP；至少先移除不必要的 inline source，并加入响应头集成测试。

### M-05 过期数据清理只在进程启动时执行

- **位置**：`apps/api/app/factory.py:323`
- **类别**：数据生命周期 / 运维
- **证据**：`cleanup_expired_records` 只在 lifespan 启动阶段调用；Coolify scheduled tasks 为空。
- **影响**：长期无重启时，credential、审计和幂等记录不能按保留策略持续清理。
- **建议**：使用独立、幂等、可观测的定时任务，记录删除数量、持续时间和失败告警。

### M-06 E2E 浏览器与可访问性矩阵过窄

- **位置**：`apps/control-plane-v3/playwright.config.ts:23`
- **类别**：测试 / 可访问性
- **证据**：仅配置 Desktop Chrome；无移动项目、Firefox、WebKit 或 axe 运行时审计。
- **影响**：移动输入法、Safari/WebKit、焦点管理和真实可访问性回归缺乏自动门禁。
- **建议**：至少加入 Mobile Chrome、WebKit 和关键页面 axe；生产冒烟单列，不与 mock E2E 混淆。

### M-07 Agent 详情缺少编辑名称/描述的前端入口

- **位置**：`apps/control-plane-v3/src/app/agents/[agentId]/page.tsx`
- **类别**：功能完整性
- **证据**：后端支持 PATCH，当前页面仅暴露启用/禁用状态操作。
- **影响**：管理员无法从控制台完成常见维护任务，只能转向 API。
- **建议**：增加内联编辑或受控对话框，补权限、失败恢复和并发更新测试。

### L-01 局部触控目标低于 44px

- **位置**：`apps/control-plane-v3/src/app/agents/[agentId]/page.tsx:256`
- **证据**：返回链接使用 `min-h-8`，即 32px；线上初始化页的输入、按钮和主题按钮实测均为 44px。
- **建议**：将移动端最小高度提升至 44px，桌面可通过媒体查询保持紧凑密度。

### L-02 EmptyState 固定为 h3，可能跳过标题层级

- **位置**：`apps/control-plane-v3/src/components/ui/empty-state.tsx:26`
- **证据**：组件无 heading level 参数，页面只有 h1 时会直接出现 h3。
- **建议**：默认 h2，或允许调用者通过 `as`/`headingLevel` 指定语义级别。

### L-03 紧凑化改动削弱部分首次使用说明

- **位置**：`apps/control-plane-v3/src/app/agents/page.tsx`、`secrets/page.tsx`、`audit/page.tsx`、`settings/management-tokens/page.tsx`
- **证据**：当前未提交 UI 改动删除了多处页面说明和 empty-state 引导。
- **影响**：熟练用户扫描效率提高，但首次用户对密钥、令牌和审计行为的理解成本上升。
- **建议**：保留关键安全语义和可操作空状态，删去重复文案而非删除恢复指引。

## 5. 初审正面发现

- **线上可用性**：Coolify 4.1.2 可达；精确资源 `vaultgate` 状态为 `running:healthy`。
- **健康探针**：`/healthz` 200，`/readyz` 200 且数据库、加密均报告 ok。
- **鉴权边界**：未登录访问 `/api/admin/session` 与 `/api/vault/me` 均返回 401。
- **网络边界**：恶意 Origin 预检未返回允许该 Origin 的 CORS 头；HTTP 302 跳 HTTPS。
- **TLS 与安全头**：Let's Encrypt 证书有效至 2026-10-19；HSTS、DENY frame、nosniff、权限策略均存在。
- **隐私暴露控制**：`robots.txt` 禁止抓取，页面带 noindex 策略。
- **工程质量**：TypeScript、ESLint、Prettier、生产构建全部通过；Compose 解析与 `git diff --check` 通过。
- **前端测试**：31 个文件、112 项测试通过；语句 75.10%、分支 68.51%、函数 63.14%、行 75.79%。
- **安全扫描**：Bandit 无 High/Medium；Python lock 的 pip-audit 无已知漏洞。
- **视觉与响应式**：1440px 与 375px 页面均无横向溢出；线上初始化页主要交互目标为 44px。
- **界面反模式**：未发现紫蓝渐变、装饰性玻璃态、嵌套卡片、指标英雄区等典型 AI 模板化问题；整体是符合运维控制台场景的克制工具型设计。

## 6. 初审验证边界

- 本地后端完整 pytest **未完成**：当前 `.venv` 为 Python 3.14.4，项目 CI 使用 Python 3.12；测试阻塞于 `apps/api/tests/conftest.py:100` 的 TestClient lifespan/AnyIO portal。该项是验证环境阻塞，不等于测试失败，也不能宣称后端全量通过。
- 本地 Playwright E2E 因沙箱不能监听 `0.0.0.0:3100` 未执行；线上公开页面已用真实浏览器视口检查，但未覆盖登录后流程。
- 线上 bootstrap 状态为 `setup_required=true` 且要求 bootstrap token。提交用户给定的账号信息得到 422：账号字段必须为有效邮箱；密码至少 12 位并同时包含大写、小写、数字和特殊字符。
- 因账号未创建，尚未执行线上登录、session cookie、Agent、Secret、Management Token、审计日志及退出登录的端到端业务验收。

## 7. 初审上线处置顺序

| 优先级 | 必做事项 | 验收标准 |
|---|---|---|
| P0 | 升级 Next.js 与 sharp | `npm audit --omit=dev` 无 High/Critical，测试与构建通过 |
| P0 | 建立 PostgreSQL 备份与恢复演练 | 有异机备份、保留策略、最近一次恢复记录及校验结果 |
| P0 | 使用合规邮箱/密码完成管理员初始化 | bootstrap 201/200、setup 不再 required、登录成功 |
| P0 | 完成生产登录后全业务流 | Agent、Secret、Token、审计、权限边界和退出登录均有实测记录 |
| P1 | 清除密码校验输入回显 | 422 中敏感字段无原始 `input` |
| P1 | 修正 readiness round-trip | encrypt/decrypt 相等测试与故障测试通过 |
| P1 | 补 Compose 限流变量 | 三种生产拓扑契约测试通过 |
| P1 | 加强 CSP 与定时清理 | 线上响应头和任务执行记录可核实 |
| P2 | 扩展浏览器/A11y 矩阵并修 UI 小项 | Mobile/WebKit/axe 门禁稳定通过 |

完成 P0 后可复评为“可上线”；P1 完成后，预计安全与运维评分可提升到 8 分以上。
