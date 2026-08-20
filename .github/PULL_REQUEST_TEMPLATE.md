## 变更说明

<!-- 一句话说明做了什么；如涉及设计决策，链接 docs/decisions/ 下的 ADR。 -->

## 检查清单

- [ ] 后端：认证边界 / 授权 / 审计 / 冲突路径测试齐全（见 AGENTS.md 新场景清单）
- [ ] 前端：i18n zh-CN 与 en 同步；已跑 `npm run generate:api-types`
- [ ] 前端新/改页面：e2e 含至少一条移动端断言；新路由已加入 `test/e2e/fixtures.ts` 的 `appRoutes`
- [ ] 部署/配置变更：tests/ops 契约测试与环境变量表已同步
- [ ] `scripts/ops/verify-fast.sh` 与 `scripts/ops/verify-control-plane.sh` 全绿
- [ ] 受影响文档已更新（guides / README / AGENTS.md / ADR）
