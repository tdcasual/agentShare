# VaultGate 部署资产与文档完善度核查报告

核查日期：2026-07-19
范围：GitHub Actions 工作流、三份 compose、Dockerfile/entrypoint、env 示例、Caddyfile、scripts/ops、ops/monitoring、README/SECURITY/CONTRIBUTING 与 docs/guides 全部文档。
方式：全部结论对照仓库实际代码/配置逐一验证；发现项已按"确证不一致即修"处理，新增指南类缺口列为待办建议。

## 1. 结论

部署资产整体完善：CI（锁文件缓存 + 迁移 + bandit/pip-audit/npm audit）→ 镜像构建 + Trivy 门 → 不可变 sha 标签部署 + 冒烟失败自动回滚的闭环完整；12 个运维脚本（备份/恢复/快照/耐久检查/密钥审计/审计导出/演练/冒烟/合成流）齐备且有文档引用；`data-durability.md`（WAL/PITR/快照/HA/季度演练）质量高。

核查发现 **1 个部署阻断 bug、10 项不一致**，已全部修复；**6 项新增指南/硬化缺口**列为建议（见 §4）。

## 2. 已修复的不一致

1. **deploy.yml 冒烟测试缺 `PUBLIC_HOST`（部署阻断）**：远程脚本写出 `.env.production` 但从不加载，`smoke-test.sh` 启动即失败 → 每次部署必触发回滚/失败。修复：写出后立即 `set -a; . ./.env.production; set +a`（位于 smoke/durability/key-recovery 全部使用点之前），契约测试改为断言 source 存在且在 smoke 调用前。
2. **prod web tmpfs 死路径**：`/home/nextjs/.next/cache`（镜像为 `USER node`，无此目录）→ 改为真实路径 `/srv/vaultgate/apps/control-plane-v3/.next/cache`（两份 prod compose）。
3. **`.env.example` 死变量**：删除 `SESSION_SECRET`、`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_SESSION_COOKIE_NAME`（旧设计残留/前端零引用）；`test_no_legacy_contract.py` 扫描范围纳入 `.env.example` 防回归。
4. **`VAULTGATE_API_TIMEOUT_MS` 双重不符**：代码默认 15s、README 声称 30s、prod 未透传 → prod compose 透传默认 30000、env 示例补充、README 更正。
5. **deployment-manual 环境变量表漏列生产必需项**：补 `BOOTSTRAP_TOKEN`（缺失即启动 crash-loop）、`TRUSTED_PROXY_CIDRS`、`AUDIT_RETENTION_DAYS`、`CREDENTIAL_RETENTION_DAYS`、`ENABLE_LOGICAL_BACKUP`。
6. **CI/CD secrets 零文档**：deployment-manual 新增 secrets 表（deploy.yml 实际引用的 8 个，注明其余工作流仅用自动注入的 `GITHUB_TOKEN`）。
7. **硬化声明与实际不符**：prod compose 为 caddy/web 补 512M/1C 资源限制（声明现已属实）；`read_only` 表述改为准确（postgres 因数据/WAL 卷写入除外）。
8. **5 个 Settings 字段生产不可配**：`SESSION_COOKIE_NAME`、`SESSION_TTL_SECONDS`、`CORS_ALLOW_CREDENTIALS`、`AUTH_RATE_LIMIT_MAX_ATTEMPTS`、`AUTH_RATE_LIMIT_WINDOW_SECONDS` 透传进两份 prod compose 与 env 示例。
9. **Caddy `2MB` vs API `2MiB`**：边缘 2.0–2.097MiB 请求被提前 413 → Caddyfile 改 `2MiB` 对齐。
10. **external-db 拓扑无自动化路径**：data-durability.md 注明该拓扑手工部署，deploy.yml 自动回滚仅覆盖标准 4 服务拓扑（回滚计数硬编码 `-eq 4`）。
11. **`PROJECT-AUDIT.md` 滞留根目录**：归档为 `docs/audits/2026-07-14-release-audit.md`，两处 plans 引用已更新。

## 3. 验证

- `pytest tests/ops` 68 通过（含更新后的 deploy 工作流契约与扩展后的 legacy 扫描）。
- 两份 prod compose `docker compose config` 渲染通过，确认 4 服务均有资源限制、新环境变量与 tmpfs 路径生效。
- deploy.yml/compose YAML 解析、部署脚本 `bash -n` 通过。

## 4. 待办建议（本次未做，按优先级）

- **高**：监控告警落地指南（`ops/monitoring/vaultgate-alerts.yml` 依赖 blackbox/postgres/node exporter，仓库无 Prometheus 样例，告警规则目前是"死文件"）。
- **中**：ENCRYPTION_KEY 轮换 runbook（`POST /api/admin/secrets/reencrypt` 端点在任何文档中均未提及）；故障排查 FAQ（readyz 503 分类、迁移锁、ACME、429 解锁、备份验证失败、XFF 配置）；日志管理小节（API/Caddy stdout 日志的采集与按 request-id 关联）；external-db 手工部署完整步骤。
- **低**：web/api/postgres `cap_drop` 扩展；`requirements.lock` 加 `--generate-hashes` + 基础镜像钉 digest；`RUN_DB_MIGRATIONS_ON_STARTUP` 文档化；备份机密性一句话说明；`start-standalone.mjs` 历史脚本清理确认。
