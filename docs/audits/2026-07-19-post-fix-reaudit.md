# VaultGate 修复后再审计报告

审计日期：2026-07-19（紧接 `2026-07-19-full-audit.md` 的修复完成后）
范围：复核上一轮全部修复（后端 B-1~B-8、Caddy P-1、前端 F-1~F-12、视觉 U-1~U-13）+ 改动文件回归猎捕 + 上轮未覆盖区域补扫。
方式：三路独立并行复审（后端、前端 bug、前端 UX，均由未参与修复的审计实例执行），发现项修复后再次全量验证。

## 1. 复核结论

上一轮 **B-1~B-8、P-1、F-1~F-12、U-1~U-13 全部落地正确**，无修错、无修出不完整的高/中危残留。重点质疑的交互点逐一核实通过：

- 截断与限流计数的一致性（`_fit_column` 对 email 恒为 no-op，不存在"写截断、查全文"的计数失效）；
- 429 不写审计后连续失败可随窗口滑动自然解锁，维持锁定成本回升为每窗口 max_attempts 个真实失败；
- dummy bcrypt 的 72 字节边界（schema 422 先于 bcrypt，崩溃路径不可达）；
- PRAGMA foreign_keys 对连接池与既有测试的影响；
- XFF 覆盖后内部健康探测（直连 127.0.0.1、无 XFF、不写审计）无异常；
- badge subtle 变体双主题 token 成对存在，实测对比度全部 ≥7.3:1；
- 删全局 focus outline 后 15 类可聚焦元素 ring 补齐，系统排查无遗漏；
- zh-CN/en 死键清理后 342/342 对齐、占位符零错位；
- dashboard eyebrow/H1 互换后单测与 E2E 断言三方一致。

## 2. 新发现与处理

### 中危（已修复）

**R-1 F-1 修复引入的回归：每次 SPA 导航闪全屏 loader + 打 2 个 API**
- 位置：`route-guard.tsx`。pathname 绑定的入口状态在导航后立即失效 → 命中全屏 loader 分支，并重跑 `resolveAppEntryState()`（bootstrap status + session 两个串行请求）。已认证用户在受保护页面间每次切换都闪"正在初始化"。
- 修复：渲染决策与跳转决策分离——跳转只认当前路径解析的状态（维持消除登录弹跳的语义）；渲染上只要最新已知状态为 `authenticated` 就直接渲染导航+页面，后台静默重校验，仅初始加载与非认证态访问受保护路径才显示全屏 loader。

**R-3 agent 详情页撤销末页最后一个 token 后卡空态无返回路径**
- 修复：照抄 secrets 页删除后回退一页的既有模式，offset 越界自动回退。同类问题的管理 Token 页（F-7 引入的 L-1）一并修复。

### 低危（已修复）

- **L-2** 会话过期访问 /logout 显示错误卡片而非直接去登录页 → 401 视为已登出直接跳转。
- **B-低1** dummy `checkpw` 无异常保护 → `contextlib.suppress(TypeError, ValueError)` 对称保护。
- **B-低3** `_as_utc` 私有导入 + 三份重复实现 → 提升为公共 `app/time_utils.py::as_utc`，5 个使用文件（orm/admin_session、orm/management_token、orm/agent_token、maintenance、rate_limit、admin_auth/service）全部切换。
- **B-低5** Caddy 契约测试按计数断言偏弱 → 改逐 `reverse_proxy` 块解析断言（含 `{remote_host}` 嵌套花括号处理）。
- **UX-1** workspace 复制失败行内错误缺 `text-destructive` → 补齐。
- **UX-2** 4 个剪贴板点位失败时 toast+行内双重播报且文案打架 → 失败只保留行内错误，成功仍 toast。
- **UX-3** audit 页 2 处裸 `role="alert"` 纳入 InlineAlert。
- **UX-4** agents 页眉 `gap-4`→`gap-5` 对齐节奏。
- **UX-5** InlineAlert 对比度理论踩线（浅色约 4.41:1、深色卡片约 4.28:1）→ 改 status-danger-subtle token 体系。
- **UX-6** 深色主题缺 5 个实心 `--status-*-foreground` 变量 → 补齐。
- **UX-7** 再清 10 个死 i18n 键（双语同步）。
- **UX-8** F-2 拦截误伤指向当前页的链接 → 排除同 path+search。

### 记录在案（原始评估）与 2026-07-20 追加修复

- **R-2 浏览器前进/后退绕过未保存授权拦截**：【已修复 2026-07-20】history sentinel 方案实现——dirty 时压入同 URL 哨兵，popstate 触发即重压并弹确认；确认后 `history.go(-2)` 离开、链接确认改 `router.replace` 覆盖哨兵，均无幻影历史条目；jsdom 真实 history 栈单测覆盖。
- **已撤销 Token 可被 rotate"复活"**（原 full-audit §7 设计问题）：【已修复 2026-07-20】revoked 状态 rotate 一律 409（agent token 与 management token 一致），expired 仍可正常轮换续期；前端同步禁用 revoked 的轮换按钮。
- **B-低2 `db.py` 迁移锁超时每次新建 `Settings()`**：【已修复 2026-07-20】`migrate_db` 支持注入 settings，lifespan 复用应用实例。
- **L-3 ConfirmDialog `isLoading` 卡死软锁**：【已修复 2026-07-20】40 秒看门狗（大于 API 30s 超时）自动解禁，可重试或取消。
- **B-低4 开发拓扑审计 IP 为 web 容器 IP**：维持不修——fail-closed 方向安全，精确性换伪造面。
- **B-低6 时钟回拨可使限流暂时失效**：维持不修——需可信时间源，无可行修；方向是放宽而非锁定，危害小。
- **L-4 无前置代理直连 Next 时客户端 IP 丢失**：维持不修——dev 均为 localhost，无实际影响。
- **幂等记录将含明文 token 的响应加密存库 7 天**（原 full-audit §7）：维持设计——可重放是幂等语义本身，响应已加密存储，保留期可配（`IDEMPOTENCY_RETENTION_DAYS`）。

## 3. 验证结果

再审计修复完成后以 `scripts/ops/verify-control-plane.sh` 全量复验，全部通过：

- 后端：`ruff check` 通过；`mypy` 51 文件无错误；`pytest apps/api/tests` **126 通过** + `tests/ops` **68 通过**，合并覆盖率 **90.32%**（门槛 80%）。
- 前端：`check:api-types`（OpenAPI 契约零漂移）、`typecheck`、`lint` 通过；`vitest` **29 文件 101 测试**通过；`next build` 生产构建通过；Playwright E2E **17/17** 通过。
- R-1 针对性新增"已认证导航不显示全屏 loader"用例；R-3 新增"末页撤销后自动回退一页"用例（offset 感知 mock）；route-guard 既有登录弹跳回归用例保持绿色。
