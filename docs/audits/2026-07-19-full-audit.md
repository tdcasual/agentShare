# VaultGate 全面审计与修复报告

审计日期：2026-07-19
审计范围：后端（apps/api）、前端（apps/control-plane-v3）、反向代理（ops/caddy）、部署配置。
审计方式：三路并行逐行审计（后端 bug、前端 bug、前端视觉/UX）+ 关键发现人工复核 + 修复后回归验证。

## 1. 总体结论

本次审计在 2026-07-14 发布审计的基础上新发现 **后端 4 个高危 bug、4 个中低危问题，前端 4 个中危 bug、8 个低危 bug，视觉/UX 25 项可改进点，反向代理 1 个审计完整性缺陷**。全部高危/中危项已修复并有回归测试；视觉/UX 项按一致性方案统一处理。

历史（2026-07-14 前）报告的 AI 模板感问题（大图标圆底空状态、Sparkles 图标、装饰性胶囊、硬编码 themeColor）经逐行核实确已清除，本次发现均为新问题。

## 2. 后端发现与修复（apps/api）

### 高危

**B-1 SQLite 默认部署下登录后 5 分钟内登录必 500**
- 位置：`app/rate_limit.py:148-159`
- 根因：`check_persistent_login_rate_limit` 中 `max(cutoff, last_success)`，`AuditLog.created_at` 经 SQLite 读回为 naive datetime，与 aware 的 `cutoff` 比较抛 `TypeError`。
- 影响：默认 SQLite 配置下，管理员成功登录一次后整个限流窗口内无法再登录。
- 修复：`last_success` 经 `_as_utc` 归一化后再比较。
- 回归测试：`test_sqlite_repeated_successful_logins_do_not_error`。

**B-2 持久化登录限流可被大小写/空白绕过（爆破）**
- 位置：写入侧 `app/modules/admin_auth/routes.py`（`actor_label=body.email`）vs 查询侧 `rate_limit.py:146`（`strip().lower()`）。
- 根因：写查归一化不一致，攻击者每轮变换 email 大小写/空白即可让失败计数恒为 0。
- 修复：写入审计前对 email 统一 `strip().lower()`。
- 回归测试：`test_login_rate_limit_counts_normalized_email_variants`。

**B-3 限流自我维持锁定 + 未认证审计写放大**
- 位置：`app/modules/admin_auth/routes.py`（429 分支仍写 `admin.login.failed` 审计）；`app/modules/vault/service.py`（无凭据请求也写审计）。
- 影响：① 攻击者每窗口 1 个请求即可永久锁定管理员账号；② 未认证者可无限灌水 `audit_logs`。
- 修复：429 分支不再写审计；vault 无 `Authorization` 头直接 401 不写审计（提供了非法凭据的仍记录）。
- 回归测试：`test_rate_limited_login_does_not_write_failure_audit`、`test_runtime_request_without_credentials_skips_audit`、`test_runtime_request_with_malformed_credentials_writes_audit`。

**B-4 PostgreSQL 下攻击者控制的超长字段致接口 500**
- 位置：`app/factory.py:86`（`x-request-id` 无长度限制）、`app/modules/tokens/routes.py:68`（`agent.name/token.name` 拼接最长 511）、`app/modules/vault/routes.py`（路径参数 `secret_id` 长度不限），均写入 `AuditLog` 的 `String(255)` 列。
- 修复：审计写入统一入口 `app/modules/audit/service.py` 新增 `_fit_column` 对全部 String(255) 字段截断；`factory.py` 对 request_id 截断（响应头同步）。
- 回归测试：`test_oversized_request_id_is_truncated_in_audit`、`test_vault_access_with_oversized_secret_id_is_truncated_in_audit`。

### 中低危

**B-5 SQLite 未启用外键 → 删除 Secret 留孤儿授权行**
- 修复：`app/runtime.py` 在 engine connect 事件执行 `PRAGMA foreign_keys=ON`（SQLAlchemy aiosqlite 官方配方）。
- 回归测试：`test_deleting_secret_cascades_token_grants`。连带：`test_durability.py` 造数补 `flush()`（FK 开启后同事务子表先行违反约束）。

**B-6 用户枚举时序侧信道**
- 修复：`app/modules/admin_auth/service.py` 邮箱不存在时对预置 dummy bcrypt 哈希执行一次 `checkpw`，拉平响应时间。
- 回归测试：`test_unknown_email_login_performs_dummy_password_check`。

**B-7 内存限流器死代码**：`check_rate_limit`/`record_failed_attempt`/`clear_attempts` 及 `_store` 无生产调用方，已连同 `test_rate_limit_store.py` 删除。

**B-8 迁移锁超时配置源不一致**：`db.py` 直接读环境变量，改用 `Settings.migration_lock_timeout_seconds`（`config.py` 已有 `Field(ge=1, le=600)` 校验）。

### 核实无问题（排除项）

AES-256-GCM 每消息随机 nonce 无复用；v2 信封支持密钥轮换；bootstrap token 用 `secrets.compare_digest`；token 只存 SHA-256 等值查找无前缀匹配；CSRF Origin 校验、CORS 白名单、Cookie HttpOnly+SameSite=lax 均正确；Alembic 4 个迁移与 ORM 零漂移；两个 vaultgate.db 为 gitignore 覆盖的本地开发产物，未被误提交。

## 3. 反向代理（ops/caddy）

**P-1 X-Forwarded-For 追加模式可被客户端伪造**
- 根因：Caddy `reverse_proxy` 默认把客户端 IP **追加**到来请求的 XFF 尾部，后端取最左段 → `curl -H "X-Forwarded-For: 1.2.3.4"` 即可伪造审计 IP 并干扰按 IP 的限流归因。
- 修复：`ops/caddy/Caddyfile` 全部 5 个 `reverse_proxy` 改覆盖式 `header_up X-Forwarded-For {remote_host}`。
- 契约测试：`tests/ops/test_caddy_edge_forwarding.py`（断言每个 reverse_proxy 都有覆盖指令）。

## 4. 前端 Bug 发现与修复（apps/control-plane-v3）

### 中危

**F-1 登录后路由弹跳 + 页面闪烁**：`route-guard.tsx` pathname 变化后旧入口状态不失效，登录后被旧 `anonymous` 状态弹回 `/login` 再弹回；SSR→spinner→页面三段跳变。修复：入口状态与解析时 pathname 绑定，路径一变立即失效；非 state-free 路径 `!mounted || !entryState` 统一渲染全屏 loader。

**F-2 未保存授权变更在 SPA 导航时静默丢失**：agent 详情页只有 `beforeunload`（客户端导航不触发）。修复：grantsDirty 时捕获阶段拦截同源链接点击，复用确认对话框，确认后放行。

**F-3 代理不转发 IP/UA**：`api/[...path]/route.ts` 白名单补 `user-agent`，XFF 透传（无 XFF 回退 `x-real-ip`）。说明：生产拓扑 Caddy 直连 API（`handle /api/*`），IP/UA 天然完整；该修复面向开发拓扑与经 web 容器的部署。

**F-4 会话 401 后原地显示英文错误**：`vaultgate-api.ts` 统一封装：非 `/admin/session` 路径 401 在浏览器端跳转 `/login`（jsdom/锁定环境有守卫）。

### 低危

- **F-5** setup 密码校验与后端策略不一致 → 前端镜像后端策略（12 位+大小写+数字+特殊字符、≤72 UTF-8 字节），新增 `setup.passwordTooWeak/passwordTooLong`。
- **F-6** 登录 429 误报"服务器错误" → 新增 429 分支与 `auth.login.rateLimited` 文案。
- **F-7** 管理 Token 列表硬上限 100 → PAGE_SIZE 25 + offset 分页（复用 PaginationControls）。
- **F-8** agent 详情 token 选择在 SWR revalidate 期间被重置 → 仅 data 已加载时才修正选中项。
- **F-9** ConfirmDialog 同帧双击触发两次 onConfirm（删除类操作第二次 404 弹错）→ 组件内 pending 态首次点击同步禁用。
- **F-10** i18n 插值未处理 `$&` 等特殊替换模式 → 函数式替换。
- **F-11** SecretRevealDialog 倒计时 interval 随父组件重渲染反复重建 → ref 稳定回调引用。
- **F-12** 已停用 agent 的签发 token 表单未前置禁用 → 禁用 + `agents.issueTokenDisabledAgent` 提示。

## 5. 前端视觉/UX 改进（阶段 C）

按"统一设计系统、消除 AI 模板感残留、修复观感缺陷"处理 20 项，全部完成：

**高严重度**
- **U-1 路由守卫 CLS**：随 F-1 一并修复（统一全屏 loader，收敛到 `PageLoader fullScreen`）。
- **U-2 移动端底部导航**：激活态仅 75%→100% 透明度差且浅色模式对比度约 3.2:1 不达标 → 激活 `text-primary`+顶部 2px 指示条，未激活 `text-muted-foreground`；`app-navigation.tsx` 任意值类收敛到 Tailwind 标准刻度。
- **U-3 原生 select**：management-tokens TTL 下拉换 Radix Select，与 agents 详情页一致。
- **U-4 Button loading 宽度坍缩**：原内容 `invisible` 占位 + Spinner 绝对定位叠加，footer 不再横向跳动。

**中严重度**
- **U-5 状态色语言**：`badge.tsx` 新增 `success`/`danger` subtle 变体并去掉 `shadow`；agents 详情/workspace 的 active 实心蓝、audit 的 denied 实心红、management-tokens 的纯绿文本全部统一为 subtle 徽章。
- **U-6 顶栏**：`supports-[backdrop-filter]` 分支补 `backdrop-blur`。
- **U-7 Dialog 关闭按钮**：命中区 16px→32px（`p-2 -m-2`），sr-only 文案 i18n 化。
- **U-8 审计统计格边框**：改 `grid gap-px bg-border` 分隔方案，移动端 2×2 与桌面 4 列均无杂线。
- **U-9 分页双边框**：删除 PaginationControls 的 `border-t`（全部 6 个使用点核实均紧跟 `border-y` 列表）。
- **U-10 docs 代码块**：`bg-foreground` 反色块在 dark 模式是亮斑 → `bg-muted text-foreground`。
- **U-11 加载态统一**：agents 列表手写灰块换 Skeleton；AgentDetailSkeleton 内边距与真实页对齐；management-tokens 文本加载换骨架；全屏 loader 收敛为单一 PageLoader。
- **U-12 i18n 卫生**：zh"下一步"→"下一页"；grep 确认零引用后双语同步删除约 40 个死键（最终 342/342 对齐）；删除 error/not-found 永不触发的英文 fallback 死代码。
- **U-13 错误展示统一**：新建 `ui/inline-alert.tsx`，替换 login/setup/secrets/agent 详情/secret-editor/agents/management-tokens 共 8 处四种并存的错误样式。

**低严重度/抛光**
- 圆角 `rounded-xl` 游离项收敛 `rounded-lg`；页面节奏统一 `space-y-8`、页眉 `pb-6`；dashboard eyebrow/H1 颠倒修正（E2E 断言同步更新）。
- 全局 `*:focus-visible` outline 与组件 ring 双层框 → 删全局规则，为 15 类依赖它的可聚焦元素逐一补 ring，键盘可见性不回退。
- error.tsx/error-boundary 补 `<main id="main-content">`（skip link 修复）。
- 新增 `src/app/icon.svg` favicon（单色盾牌+钥匙孔，`--primary` OKLCH 换算 `#1467c2`）。
- Toaster 去掉 `richColors` 并接入全部 4 个剪贴板点位的成功/失败 toast（新增 `common.copySuccess/copyFailed` 双语键）。
- 授权面板 checkbox `accent-primary` 放大；404 图标换 FileQuestion；登录卡片 `max-w-md`；docs origin 改骨架占位消除闪烁；ConfirmDialog loading 换 Spinner；删除 Button `aria-live` 噪音、`--font-display` 死 token、login/setup 残留布局 class。

## 6. 验证结果

最终以 `scripts/ops/verify-control-plane.sh` 全量验证为准，全部通过：

- 后端：`ruff check` 通过；`mypy` 50 文件无错误；`pytest apps/api/tests tests/ops` **193 通过**，合并覆盖率 **90.31%**（门槛 80%）。
- 前端：`check:api-types`（OpenAPI 契约零漂移）、`typecheck`、`lint` 通过；`vitest run --coverage` **29 文件 98 测试**通过；`next build` 生产构建通过；Playwright E2E **17/17** 通过。
- 每个后端高危修复均"先对旧代码复现失败、再对新代码验证通过"；前端关键修复（路由守卫、token 选择、ConfirmDialog 竞态）均有针对性新单测（`agent-detail-page.test.tsx`、`setup/page.test.tsx` 两个新文件）。

## 7. 明确不做（记录在案）

- 已撤销 token 可被 rotate"复活"：前后端行为一致，属产品语义决策，需确认后再改。
- 幂等记录将含明文 token 的响应加密存库 7 天可重放取出：设计取舍，加密缓解但不消除可检索窗口。
- 语言切换 UI：`setLocale` 已存在但无入口，en.json 文案完整，属新功能。
- next/font 自托管字体：构建期联网下载有失败风险，保留系统字体栈。
- 生产 `TRUSTED_PROXY_CIDRS=172.30.0.2/32` 仅信任 Caddy：生产拓扑 Caddy 直连 API，配置正确；经 web 容器的拓扑才需扩展信任列表。
