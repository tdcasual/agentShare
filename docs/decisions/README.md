# 决策记录（ADR）

记录 VaultGate 中"看似可疑但实为设计"的决策。遇到与直觉相悖的行为，先查这里再动手"修复"；确认是新问题时走正常审计/缺陷流程。

格式：`ADR-NNN-短标题.md`，包含 日期 / 状态 / 背景 / 决策 / 后果。状态取值：已采纳 / 已废弃 / 已被 ADR-XXX 取代。

新增决策：追加编号文件，并在根级 `AGENTS.md` 第 7 节登记一行摘要。

## 索引

| 编号 | 决策 | 状态 |
|---|---|---|
| [ADR-001](./ADR-001-secret-name-global-uniqueness.md) | Secret 名称全局唯一 | 已采纳 |
| [ADR-002](./ADR-002-password-change-does-not-revoke-tokens.md) | 改密不连带吊销管理/agent 令牌 | 已采纳 |
| [ADR-003](./ADR-003-coolify-trusted-proxy-cidrs.md) | Coolify 保留宽 TRUSTED_PROXY_CIDRS 默认值 | 已采纳 |
| [ADR-004](./ADR-004-control-plane-ui-stopgap.md) | 控制面 UI 为过渡版，重建中 | 已采纳 |
| [ADR-005](./ADR-005-visual-baseline-strategy.md) | 截图基线策略 | 已采纳 |
| [ADR-006](./ADR-006-agent-onboarding-credentials.md) | Agent onboarding 凭据与 Space 范围 | 已采纳 |
