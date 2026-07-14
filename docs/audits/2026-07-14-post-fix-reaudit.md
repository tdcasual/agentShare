# VaultGate 修复后复审

日期：2026-07-14  
分支：`fix/robustness-audit-round-2`

## 结论

整体评分：**92 / 100，可发布**。

| 维度 | 修复前 | 修复后 | 结论 |
| --- | ---: | ---: | --- |
| 架构边界 | 84 | 93 | Admin/Vault/Agent/Token 边界稳定，旧停用入口已删除 |
| 代码整洁 | 78 | 91 | DTO、查询键、翻译和按钮兼容层已收口 |
| 后端鲁棒性 | 67 | 94 | 输入 422、轮换 TTL、代理 IP、生命周期与迁移目标已修复 |
| 前端质量 | 70 | 89 | Skip Link、确认、错误转换、分页、dirty 保护和触控目标已修复 |
| 测试质量 | 86 | 95 | 后端 98、前端 65、运维 57 项通过，增加真实容器权限流程 |
| 部署与恢复 | 65 | 90 | SHA/digest 部署、扫描门禁、镜像回滚、单事务恢复已实现 |
| 安全与审计 | 76 | 94 | 可信代理 `/32`、真实 IP、精确统计/筛选与保留策略已实现 |

## 已关闭问题

- 原审计 Critical 1/1、High 9/9、Medium 10/11、Low 4/4 已关闭。
- Token 轮换按原始 TTL 从轮换时刻续期；永久 Token 保持永久。
- Secret 类型和 PATCH 显式空值在 Pydantic 层返回 422。
- 限流、会话和审计统一使用只信任固定 Caddy 地址的真实客户端 IP。
- dotenv 不再作为 shell 执行；特殊字符数据库密码通过真实 Compose 展开。
- 镜像在同一 workflow 中构建、扫描、再推送；部署只接受 `sha-*` 并解析 digest。
- Smoke 失败自动恢复旧容器镜像；`pg_restore` 使用单事务与遇错退出。
- Swagger 迁至 `/api/docs`，前端 `/docs` 在生产路由可达。
- Agent 停用、Token 轮换/撤销使用确认对话框。
- Agent 状态变化只有 PATCH 契约，并记录 `agent.enable`/`agent.disable`。
- Agent Token 和管理 Token 列表有分页；Token DTO 与前端类型一致。
- 审计支持 actor/resource/时间筛选，Granted 只统计 Agent 成功访问。
- 认证使用时间写入节流，启动清理过期凭据和超期审计。
- 删除旧 Tokens 翻译、Button variant 兼容别名、重复 navigation 键和无效生产配置。

## 剩余事项

### 功能完整度（Medium）

已批准设计中的 Secret 编辑、搜索、标签输入、管理员临时查看明文，以及 Agent 最近活动/关联审计/TTL 输入尚未全部落地。这些是产品功能差距，不影响当前核心的创建、授权、读取、轮换、撤销和审计闭环。

### 恢复演练增强（Low）

当前恢复已使用 `--single-transaction --exit-on-error`，避免半恢复。更高等级的“恢复到临时库、验证后切换”需要额外数据库切换与维护窗口架构，可作为多实例部署阶段的后续增强。

## 验证证据

- 后端：98 tests，覆盖率 92.54%，Ruff/mypy 通过，Bandit 无中高危。
- 前端：65 tests，ESLint/TypeScript/Prettier/Next.js production build 通过。
- 运维：57 tests，真实 Compose 特殊字符 env 展开通过。
- 依赖：`pip-audit` 0；官方 npm audit 0。
- 镜像：API、Web、PostgreSQL、Caddy 的 Trivy 可修复 High/Critical 均为 0。
- 容器：真实 PostgreSQL + API + Web 完成初始化、Secret、Agent、Token、allowlist、Vault 读取、停用拒绝、审计与分页流程；Alembic 位于 head，日志无未处理异常。
