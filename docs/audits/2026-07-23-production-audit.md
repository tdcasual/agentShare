# VaultGate 项目与生产部署全面审计（初审 2026-07-23，复审 2026-07-24）

## 1. 复审结论（2026-07-24）

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

## 2. 初审结论（2026-07-23）

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

## 3. 初审发布门禁与重点发现

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

## 4. 初审正面发现

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

## 5. 初审验证边界

- 本地后端完整 pytest **未完成**：当前 `.venv` 为 Python 3.14.4，项目 CI 使用 Python 3.12；测试阻塞于 `apps/api/tests/conftest.py:100` 的 TestClient lifespan/AnyIO portal。该项是验证环境阻塞，不等于测试失败，也不能宣称后端全量通过。
- 本地 Playwright E2E 因沙箱不能监听 `0.0.0.0:3100` 未执行；线上公开页面已用真实浏览器视口检查，但未覆盖登录后流程。
- 线上 bootstrap 状态为 `setup_required=true` 且要求 bootstrap token。提交用户给定的账号信息得到 422：账号字段必须为有效邮箱；密码至少 12 位并同时包含大写、小写、数字和特殊字符。
- 因账号未创建，尚未执行线上登录、session cookie、Agent、Secret、Management Token、审计日志及退出登录的端到端业务验收。

## 6. 初审上线处置顺序

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
