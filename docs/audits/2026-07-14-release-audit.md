# VaultGate 项目审计与发布验证报告

审计日期：2026-07-14
审计范围：后端、前端、数据库迁移、认证与授权、审计日志、测试、CI/CD、容器与运维文档。
实施依据：`docs/plans/2026-07-13-vaultgate-architecture-implementation.md`、`docs/plans/2026-07-14-docker-release-validation.md`。

## 1. 最终结论

**总体评估：发布候选已通过源码、依赖、容器、PostgreSQL、TLS、备份恢复与核心权限闭环验证；当前没有已知发布阻塞项。**

项目已收敛为单管理员、多 Agent、每 Agent 多 `vg_` Token、每 Token 独立 Secret Grant 的模块化单体。浏览器 Session 与 `vgm_` 管理 Token 只进入 `/api/admin/*`，`vg_` Token 只进入 `/api/vault/*`；Tags 只用于展示，不参与授权。

原审计的 3 个 Critical、7 个 High 及相关重构遗留已经按 12 项计划处理：服务端 Session 可撤销、拒绝审计独立持久化且审计失败时不返回明文、可信代理限流按 IP+邮箱隔离、Web 可管理 Agent/Token/Grant、保数据 Alembic 迁移可升级且零漂移、旧 routes/ORM/types/shims 已删除。管理行为也通过 `/api/admin/*` 提供 API。

宿主已安装 Docker Engine 29.1.3、Compose 2.40.3、Buildx 0.30.1 和 containerd 2.2.2。开发与生产拓扑均在真实容器中运行；生产路径使用本地 Caddy CA 做严格 TLS 校验，没有使用 `curl -k`。全新 PostgreSQL 数据卷可自动迁移到 `20260713_01`，已有数据卷完成重启持久化与备份/恢复演练。

实机审计额外发现并修复了 6 个仅靠源码测试难以暴露的问题：API 镜像 PEP 517 隐式联网安装、SQLAlchemy URL 字符串化导致 PostgreSQL 密码被替换为 `***`、审计 Token 前缀列长度不足、Web 运行镜像携带未使用且有漏洞的 npm 工具链、上游 Caddy 镜像的系统/Go 漏洞，以及上游 PostgreSQL 镜像中旧 Go 编译的 `gosu` 漏洞。最终四个发布镜像的可修复 High/Critical 均为 0。

## 2. 最终验证

| 检查 | 2026-07-14 结果 | 说明 |
|---|---|---|
| Git diff | 通过 | `git diff --check` 无空白错误 |
| Ruff / mypy | 通过 | 43 个后端源文件无 lint/type 错误 |
| Bandit | 通过 | 扫描 2,127 行；`-ll` 中高危为 0，保留 3 个低危提示 |
| API 测试 | 75/75 通过 | API + 运维合并覆盖率 87.48%，门槛 80%；仅 14 条上游 cookie 弃用提示 |
| Alembic | 通过 | 全新 SQLite 升级到 `20260713_01`；`alembic check` 零漂移 |
| 运维契约 | 50/50 通过 | 包含旧契约清除、四镜像供应链、部署源、E2E/依赖审计 CI 门 |
| 前端检查 | 通过 | Next typegen、TypeScript、ESLint、Prettier 全通过 |
| 前端单元测试 | 55/55 通过 | 21 个测试文件 |
| 前端覆盖率 | 已生成 | 语句 72.87%、分支 56.37%、函数 50%、行 74.57% |
| E2E | 15/15 通过 | Playwright 1.61.1 + 系统 Chrome；CI 统一脚本现包含 E2E |
| 前端生产构建 | 通过 | Next.js 16.2.10；Agent 路由存在、旧 Token 路由不存在 |
| Python 依赖审计 | 通过 | `requirements.lock` 无已知漏洞 |
| npm 依赖审计 | 通过 | 官方 registry 全依赖 0 漏洞；移除未使用 Lighthouse/LHCI |
| Docker / Compose | 通过 | dev/prod 渲染成功；空数据卷三服务健康；生产四服务健康并通过严格 TLS smoke |
| PostgreSQL | 通过 | PostgreSQL 16 首次初始化、Alembic head、重启持久化、审计写入及 pg_dump/restore 演练通过 |
| 核心 synthetic flow | 通过 | Bootstrap、Session、`vgm_`、Secret、Agent、多 Token 独立 Grant、默认拒绝、审计、轮换/撤销/禁用均通过 |
| Trivy 镜像门 | 通过 | API、Web、Caddy、PostgreSQL 四镜像的可修复 High/Critical 均为 0 |

## 3. 历史审计发现（均已被当前实现取代）

以下 22 项保留为重构前审计证据，位置、行为和测试数字不再代表当前工作树。

### Critical Findings

### C1. 拒绝访问审计记录被事务回滚

- **位置**：`apps/api/app/services/permission.py:102`、`apps/api/app/routes/vault.py:146`、`apps/api/app/db.py:212`
- **类别**：Security / Audit integrity / Transaction design
- **描述**：`check_permission()` 在拒绝访问时只执行 `db.add(AuditLog(...))`，路由随后抛出 `HTTPException(403)`；`get_async_db()` 的异常路径会 rollback 当前 session，因此 denied 记录永不落库。
- **实证**：隔离 SQLite 流程创建用户、密钥和无 scope Token，请求 `/api/vault/{id}` 得到 403，随后查询 `audit_logs` 得到 `[]`。
- **影响**：攻击、误配和越权尝试无法审计；UI 的 denied 统计和文档中的安全承诺不成立。
- **建议**：将审计写入独立事务/session，或在返回 403 前显式提交审计且避免依赖异常回滚；增加“403 后 denied 行已持久化”的集成测试。
- **完成标准**：无 scope、不存在密钥、过期/撤销 Token 等拒绝路径均持久化；审计写入失败有日志且不泄漏密钥数据。

### C2. Web 控制台缺失 Token scope 授权流程

- **位置**：`apps/control-plane-v3/src/app/tokens/page.tsx:26`；未使用 `src/domains/token.ts:48` 的 `useScopes/addScopes/removeScope`
- **类别**：Core functionality / Refactor regression
- **描述**：后端保留完整 scope API，前端 domain 也保留 hooks，但 Token 页面只能创建、复制前缀和撤销 Token，没有选择密钥、授予权限或撤销权限的 UI。
- **影响**：通过 Web 创建的 Token 没有任何 scope，调用 `/api/vault` 只能得到空列表；核心产品价值无法通过主界面完成。
- **建议**：在 Token 详情/展开区加入当前 scope 列表、可授权密钥选择、批量授权和撤销；创建 Token 后直接引导授权。
- **完成标准**：纯 Web 流程可创建密钥、创建 Token、授予该密钥、用 Token 读取、撤销后立即得到 403，并有 E2E 覆盖。

### C3. 部署工作流引用不存在的上传源

- **位置**：`.github/workflows/deploy.yml:55`、`docs/guides/deployment-manual.md:30`
- **类别**：Deployment / Release blocking
- **描述**：SCP source 包含根目录 `.env.production.example`，仓库不存在该文件；真实模板是 `ops/compose/prod.env.example`。部署手册也使用同一错误路径。
- **影响**：部署在复制资产阶段失败，无法到达 Compose 验证和 smoke test。
- **为什么测试没发现**：`tests/ops/test_deploy_workflow.py` 只搜索命令字符串；`test_container_artifacts.py` 检查正确模板存在，却不解析 SCP source 并验证每个文件。
- **建议**：删除错误源或统一模板路径；新增测试解析上传清单并断言每个本地源存在。
- **完成标准**：在临时目录模拟部署资产打包成功；工作流上传清单与文档只引用一个权威模板。

## 4. High Findings

### H1. 首次初始化入口被硬编码绕过

- **位置**：`apps/control-plane-v3/src/lib/session.ts:44`、`src/components/route-guard.tsx:79`
- **描述**：`getBootstrapStatus()` 永远返回 `{ initialized: true }`，但路由守卫仍保留 `bootstrap_required` 分支；实际上该状态不可达。
- **实证**：E2E mock `/api/bootstrap/status` 为 false，访问 `/` 仍停在 Dashboard；访问 `/login` 也不会跳 `/setup`。
- **影响**：全新部署用户不会被引导创建首个管理员，只能手工猜测 `/setup` 或调用 API。
- **建议**：恢复真实 bootstrap status 请求，明确定义 `bootstrap_required`；为 `/`、`/login`、`/setup` 三条入口写契约测试。

### H2. 会话 Cookie 没有可验证的服务端过期时间

- **位置**：`apps/api/app/dependencies.py:38`、`apps/api/app/routes/auth.py:87`
- **描述**：签名内容只有 `user_id:nonce:hmac`，没有 `issued_at/exp`；验证只校验 HMAC。`Max-Age` 由浏览器执行，复制或恢复的 Cookie 可在 SESSION_SECRET 不变时长期重放；logout 也只删除客户端 Cookie，没有服务端撤销状态。
- **影响**：泄漏的管理会话无法单独吊销，12 小时 TTL 不是服务端安全边界。
- **建议**：至少把签发和过期时间纳入签名并在服务端校验；更稳妥的是持久化哈希 session ID、过期时间与撤销状态。

### H3. Caddy 后登录限流把所有用户放入同一桶

- **位置**：`apps/api/app/rate_limit.py:67`、`ops/caddy/Caddyfile:17`
- **描述**：限流故意只使用 TCP peer IP，不信任代理头；在生产拓扑中 peer 永远是 Caddy，因此任意 5 次失败会锁定所有用户 5 分钟，成功登录还会清掉全站共享失败记录。
- **影响**：低成本全站登录拒绝服务；多副本部署时各实例又各自计数，限制不一致。
- **建议**：只信任来自已知 Caddy 网络的规范化客户端 IP，并使用 email/IP 组合；生产使用共享、原子、有 TTL 的限流存储。

### H4. API 测试客户端依赖未声明，干净 CI 无法收集测试

- **位置**：`apps/api/pyproject.toml:24`、`scripts/ops/bootstrap-dev-runtime.sh:14`、`.github/workflows/ci.yml:34`
- **描述**：`apps/api[dev]` 没有声明 Starlette TestClient 所需依赖。当前 Starlette 1.3.1 要求 `httpx2`，干净 venv 在导入 `fastapi.testclient` 时直接报错；历史 `apps/api/.venv` 的旧 `httpx` 掩盖了问题。
- **影响**：全新 CI runner 无法执行 85 个 API 测试；“绿色基线”依赖未跟踪的本地环境。
- **建议**：明确锁定并声明 TestClient transport 依赖，删除/避免嵌套历史 venv，CI 增加 `pip check` 和一次真正的 clean-install job。

### H5. E2E 契约与当前 API/UI 大面积漂移

- **位置**：`apps/control-plane-v3/test/e2e/fixtures.ts:8`、`src/lib/vaultgate-api.ts:106`、`apps/api/app/routes/auth.py:127`
- **描述**：E2E mock `/session/me` 返回旧 `ManagementSessionSummary`，当前后端返回 `{user_id,email,role,created_at}`；测试仍依赖旧文案、旧按钮角色和旧导航词。
- **影响**：7/16 通过、9/16 失败；CI 当前也没有运行 `npm run test:e2e`，真实用户流程缺少质量门。
- **建议**：从共享契约生成/集中定义 fixtures；修复入口逻辑后把 E2E 加入独立 CI job。

### H6. 审计筛选 UI 没有把 granted/denied 传给后端

- **位置**：`src/app/audit/page.tsx:22`、`src/domains/audit.ts:19`、`src/lib/vaultgate-api.ts:313`、`apps/api/app/routes/audit.py:32`
- **描述**：页面状态使用 `granted?: boolean`，但 `AuditLogsQuery` 只支持 action/token/secret；展开对象后 SWR key 和请求参数都忽略 granted。`isAllActive = !filter.action && !filter.granted` 还会在 `granted:false` 时同时激活“全部”和“拒绝”。
- **影响**：用户点击筛选但数据不变，且统计只基于当前最多 100 条日志而不是真实总量。
- **建议**：统一后端 `result=success|denied` 契约；修正 active 判定；统计使用聚合 API 或清晰标注“当前页”。

### H7. 审计范围与产品文档承诺不一致

- **位置**：`README.md:23`、`apps/api/app/routes/tokens.py`、`apps/api/app/routes/secrets_mgmt.py`
- **描述**：README 声称“Every secret access and token operation is logged”，实际只有 Bearer Vault 的 list/read 被记录；密钥创建/更新/删除、Token 创建/撤销、scope 授予/删除、登录/失败登录均未写 AuditLog。
- **影响**：管理面关键变更无法追责，事故响应缺少操作证据。
- **建议**：先定义审计事件字典、actor、resource、result 和 metadata，再集中写入；不要在各路由零散复制。

## 5. Medium Findings

### M1. 前端保留旧会话模型并伪造字段

- **位置**：`src/shared/types/index.ts:13`、`src/lib/session.ts:49`、`src/lib/session-state.ts:14`
- **描述**：前端仍保留 actor/session/issued_at/expires_at 等旧控制平面字段，然后用空 session ID、`issued_at=0`、`expires_at=43200` 伪造适配当前用户接口。
- **影响**：类型检查只验证内部自洽，不能验证真实 API；增加死概念和误导性状态。
- **建议**：以当前后端响应为唯一会话类型；删除 `session-state` 中不可实现的 expired/forbidden/session summary 字段，或让后端真正提供它们。

### M2. 单一 admin 角色仍保留 role store/role system 兼容层

- **位置**：`src/store/role-store.ts`、`src/lib/role-system.ts`
- **描述**：所有用户都是 admin，`getRequiredRoleForPath()` 永远返回 null，但 Zustand store 和角色比较逻辑仍存在。
- **影响**：重构噪声、额外状态同步、测试夹具继续沿用旧 RBAC 概念。
- **建议**：若短期不恢复 RBAC，删除 shim；若确需多用户权限，先写明确权限模型再实现。

### M3. 前端 API 类型与响应不一致

- **位置**：`src/lib/vaultgate-api.ts:106`、`:113`、`:160`、`:186`、`:217`
- **示例**：`User` 要求 `id`，后端返回 `user_id`；Secret/Token 类型包含后端列表不返回的 `user_id/username/updated_at`；Scope 要求不存在的 `allowed`；login/logout Promise 声明 `message`，后端返回 `status`。
- **影响**：运行时字段为 undefined，但编译不报错；mock 很容易继续伪造旧响应。
- **建议**：引入 OpenAPI 类型生成，或至少为每个 endpoint 使用精确 response DTO 并加契约测试。

### M4. 后端测试覆盖配置与 CI 行为矛盾

- **位置**：`apps/api/pyproject.toml:57`、`.github/workflows/ci.yml:56`、`scripts/ops/verify-control-plane.sh:27`
- **描述**：pytest 默认要求 80% 覆盖率；CI 的第一轮测试显式覆盖 `addopts`，统一脚本又带默认覆盖率。`--collect-only` 会以 43% coverage 失败，命令语义混乱。
- **影响**：同一套测试在不同入口结果不同，排错困难。
- **建议**：拆分 `test` 与 `coverage` 命令，CI 只保留一个权威调用；输出 coverage artifact。

### M5. 前端测试覆盖数字掩盖关键层无覆盖

- **位置**：`src/domains/*.test.ts`、`src/lib/vaultgate-api.ts`
- **描述**：domain 测试只断言导出是 function；domain 语句覆盖 11.47%、分支 0%，API client 语句覆盖 9.67%。Secrets 页面仅 31.25%。
- **影响**：缓存失效、请求契约、超时、错误映射、mutations 和关键表单都可回归而单测仍绿。
- **建议**：测试行为而非导出；优先覆盖 API client、SWR cache key、scope CRUD、初始化和错误状态。

### M6. 列表分页后端存在、前端未实现

- **位置**：`apps/api/app/routes/secrets_mgmt.py:33`、`routes/tokens.py:108`、`routes/audit.py:27`；前端 domains/pages
- **描述**：后端默认 limit 50，前端 Secret/Token 只取第一页且丢弃 total；Audit 固定 100 条，无翻页。
- **影响**：超过 50 个密钥/Token 后内容“消失”，Dashboard 用当前页长度冒充总数。
- **建议**：实现分页或游标；Dashboard 使用后端 total/统计 endpoint。

### M7. Bootstrap 并发保护并不可靠

- **位置**：`apps/api/app/routes/bootstrap.py:119`
- **描述**：对“可能不存在的第一行”执行 `SELECT ... LIMIT 1 FOR UPDATE` 无法锁住空集合；SQLite 也忽略该语义。并发首次初始化仍可能都看到无用户，最后由 email unique 或不同 email 创建多个账户。
- **影响**：首次部署暴露期间可竞争创建管理员。
- **建议**：使用数据库级 advisory lock、单行 bootstrap state、串行izable 事务或明确捕获唯一初始化约束。

### M8. 生产 smoke test 不验证核心业务闭环

- **位置**：`scripts/ops/smoke-test.sh`
- **描述**：只检查 health、ready、request ID 和首页 HTTP 成功，不验证 API proxy、bootstrap/login、Cookie、密钥加密、Token scope 或 Vault 读取。
- **影响**：错误镜像组合、前后端契约断裂和初始化问题可在部署后仍通过 smoke。
- **建议**：保留无副作用 smoke，再增加可清理的 staging synthetic flow；生产至少检查 bootstrap status 与 session unauthorized 契约。

## 6. Low Findings

### L1. 文档版本与 Cookie 名称漂移

- 根 README 和前端 README 仍写 Next.js 15，实际为 16.2.10。
- 前端 README 写 `management_session`，实际统一为 `vaultgate_session`。
- `docs/guides/deployment-manual.md` 使用错误 env 模板路径，并写 `--build`，而 production compose 只接受发布镜像。

### L2. 现有 UI 审计报告已过期

- **位置**：`docs/audits/2026-07-13-control-plane-ui-audit.md`（原 `apps/control-plane-v3/AUDIT-REPORT.md`）
- 多项 Critical/High 已在后续提交修复（AlertTriangle、EmptyState、Callout、Badge span、按钮 loading、theme color 等），但报告未标注 resolved，仍把已修问题列为待办。
- 建议保留历史报告但增加审计 commit、状态和 superseded 链接，避免重复劳动。

### L3. Bandit 低风险项未分类抑制

- `SecretType` 枚举中的 password/token 字符串属于误报；默认开发 session secret 和 `_decode_key()` 的宽泛吞异常是真实维护问题。
- 建议对误报做窄范围配置，对真实项改成严格 base64 校验并保留异常上下文。

### L4. npm audit 依赖镜像不支持安全 API（已解决）

- 当前 registry mirror 对 `/-/npm/v1/security/audits/quick` 返回 NOT_IMPLEMENTED。
- CI 与本次审计显式使用 `https://registry.npmjs.org`；最终结果为 0 漏洞。

## 7. 架构与重构遗留模式

### 7.1 当前有效架构

```text
Browser
  ├─ Next.js pages + SWR domains
  ├─ production: Caddy /api/* → FastAPI
  └─ optional Next /api proxy → FastAPI
FastAPI
  ├─ browser Session / vgm_ → /api/admin/*
  ├─ vg_ Agent Token → /api/vault/*
  ├─ explicit Token-to-Secret Grant → default-deny reads
  ├─ AES-256-GCM application encryption
  └─ SQLAlchemy/Alembic → PostgreSQL 16 (SQLite unit tests)
```

这套架构对小型 VaultGate 足够，不需要再引入旧控制平面的插件、事件总线或复杂 RBAC。真正需要的是收紧契约和完成闭环。

### 7.2 反复出现的遗留模式

| 模式 | 证据 | 后果 |
|---|---|---|
| 删除功能页面但保留 domain/type/shim | scope hooks、role store、旧 session summary | 编译通过但功能不完整 |
| Mock 复制旧响应而非复用契约 | E2E fixtures | 后端改动后测试假红/假绿 |
| 测试只做字符串存在性断言 | deploy workflow tests | 不存在文件仍通过 |
| 报告不绑定审计 commit/状态 | UI AUDIT-REPORT | 已修项继续被当成缺陷 |
| 多个“权威”验证入口 | pytest addopts、CI、verify script | 同一仓库不同命令不同结论 |
| README 宣称完整能力，代码只覆盖子集 | audit logging、初始化、scope UI | 用户预期与实际产品不一致 |

## 8. 正面发现

- 管理 CRUD 基本都按 `user_id` 过滤，Token/Secret/Scope 所有权校验整体清晰。
- Bearer Token 只存 SHA-256 hash，原文仅创建时返回；随机强度足够。
- AES-256-GCM 每次使用随机 IV，篡改和错误 key 均有测试。
- Vault 对不存在密钥返回 403，避免资源枚举；scope 默认拒绝。
- 生产设置对默认加密密钥、默认 session secret 和非 secure Cookie fail-fast。
- CORS header 白名单、CSRF Origin 校验、HttpOnly/SameSite Cookie、CSP/HSTS 等基础防护存在。
- 前端静态检查、单元测试、生产构建稳定；主题、i18n、reduced motion 和基础 A11y 已有较好投入。
- API/Web 镜像使用非 root 用户；PostgreSQL 入口点主动降权；Caddy 仅保留 `NET_BIND_SERVICE`。production compose 使用只读文件系统、`no-new-privileges`、网络分段与资源限制。
- Alembic、备份/恢复脚本、health/readiness、request ID 和运维文档都已具备骨架。

## 9. 完成状态与剩余风险

| 原阶段 | 状态 | 验证依据 |
|---|---|---|
| 可信质量门 | 完成 | 统一验证脚本、125 个 Python 测试、55 个前端单测、15 个 E2E、生产构建 |
| 安全闭环 | 完成 | 可撤销 Session、可信代理限流、拒绝审计、管理审计、严格 API 边界 |
| 核心产品闭环 | 完成 | 单管理员、多 Agent、多 Token、独立 Secret Grant、轮换/撤销/禁用 synthetic flow |
| 重构遗留清理 | 完成 | 旧 routes/ORM/types/session/role/token UI 兼容层删除，旧契约回归测试通过 |
| 发布与运维验收 | 完成 | 四镜像构建/扫描、dev/prod Compose、TLS smoke、迁移、备份恢复 |

保留的非阻塞风险：前端覆盖率仍低于后端，尤其 Secrets 页面和 API client；测试环境的 Starlette Cookie API 有 14 条上游弃用提示；本次执行的是数据库备份恢复，而不是把新 schema 降级给旧应用版本。项目明确不要求旧兼容层，因此不建议为旧应用回滚重新引入兼容代码；生产发布仍应保留部署前备份，并以向前修复或整库恢复作为回退策略。

## 10. 后续维护建议

1. 所有授权变化先写失败测试，保持 Tags 永不参与权限判断。
2. 每次发布同时扫描 API、Web、Caddy、PostgreSQL 四个最终镜像，不能只扫描基础镜像或源码依赖。
3. 数据库变更继续使用保数据 Alembic 迁移；部署前自动备份，恢复后执行 readiness 与 Agent read synthetic check。
4. 优先增加 Secrets 页面、API client、错误路径和分页测试，不再进行缺少明确收益的大规模重构。
