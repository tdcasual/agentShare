# 审计报告索引

本目录归档 VaultGate 各轮审计与复审报告，按日期排序。

| 日期 | 报告 | 主题 | 结论状态 |
|---|---|---|---|
| 2026-07-13 | [2026-07-13-control-plane-ui-audit.md](2026-07-13-control-plane-ui-audit.md) | 控制面 v3 前端 UI 审计（A11y、性能、主题、响应式、反模式、UX 文案） | 历史：已被 2026-07-14 Agent 中心界面重构取代，报告内保留"已被取代"声明 |
| 2026-07-14 | [2026-07-14-cleanliness-robustness-audit.md](2026-07-14-cleanliness-robustness-audit.md) | 代码整洁与鲁棒性审计（75/100，条件通过） | 历史：发现项当日修复，被同日复审取代 |
| 2026-07-14 | [2026-07-14-post-fix-reaudit.md](2026-07-14-post-fix-reaudit.md) | 整洁/鲁棒性修复后复审（92/100，可发布） | 历史：已闭环 |
| 2026-07-14 | [2026-07-14-post-ui-polish-audit.md](2026-07-14-post-ui-polish-audit.md) | 功能与前端打磨后复审（AI Slop Check：Pass） | 历史：已闭环 |
| 2026-07-14 | [2026-07-14-release-audit.md](2026-07-14-release-audit.md) | 发布审计与验证（源码、依赖、容器、PostgreSQL、TLS、备份恢复、权限闭环） | 历史：发布候选通过；后续 07-19 全面审计在此基础上发现新问题 |
| 2026-07-19 | [2026-07-19-deployment-docs-review.md](2026-07-19-deployment-docs-review.md) | 部署资产与文档完善度核查 | 已闭环：1 个部署阻断 bug 与 10 项不一致全部修复；6 项指南/硬化建议另列待办 |
| 2026-07-19 | [2026-07-19-full-audit.md](2026-07-19-full-audit.md) | 全面审计（后端/前端 bug、视觉/UX、Caddy） | 已闭环：高/中危全部修复，经当日再审计复核 |
| 2026-07-19 | [2026-07-19-post-fix-reaudit.md](2026-07-19-post-fix-reaudit.md) | 修复后再审计（含 2026-07-20 追加修复记录） | 已闭环：全部通过；验证数字为 07-19 时点快照，以最新验证为准 |
| 2026-07-20 | [2026-07-20-ui-ux-live-audit.md](2026-07-20-ui-ux-live-audit.md) | 真实栈 + Playwright 实测走查（UI/UX 与业务流） | 最新一轮：核心业务流全通，发现项已修复/闭环；以最新验证为准 |
| 2026-07-20 | [2026-07-20-comprehensive-scorecard.md](2026-07-20-comprehensive-scorecard.md) | 五维度评分式全面审计（总评 7.8/10） | 最新评分基线；改进优先级见报告末节 |
| 2026-07-23 | [2026-07-23-production-audit.md](2026-07-23-production-audit.md) | 当前工作树 + Coolify 生产部署全面审计与七维评分 | 最新：7.2/10，条件不通过；管理员与登录后生产业务流待合规凭据闭环 |

统一口径：各报告中的测试数字均为对应报告时点的快照；仓库最新状态以 `scripts/ops/verify-control-plane.sh` 的最新运行为准。
