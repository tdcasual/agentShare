# ADR-006 Agent onboarding credentials and Space scope

日期：2026-08-20  
状态：已采纳

## 背景

管理员需要把 Agent 加入 VaultGate，而不能把长期 `vg_` Token 直接放进可复制的 Prompt。现有 Space 权限绑定在 Agent Token 上，不是 Agent 上。

## 决策

- 使用 `vgi_` 作为 onboarding-only 凭据前缀；`vgi_` 只允许访问 `/api/onboarding/v1/*`。
- 邀请代码短期、一次性、只保存 hash；申请凭据同样只保存 hash。
- 审批时创建 Agent、初始 `vg_` Token 和可选的 Space Token membership；这些操作在同一事务完成。
- 初始 `vg_` Token 加入 Space，不宣称 Agent 的所有后续 Token 自动继承该权限。
- Token 交付值使用应用加密服务保存，领取接口使用幂等键，允许同键重试，禁止不同键二次领取。
- “public”解释为指定 Space 成员可见；不增加隐式全局授权。

## 后果

- Prompt 泄漏不会直接泄漏长期 Agent Token，但邀请代码仍需像短期凭据一样保护。
- 后续若需要 Agent 级 Space 权限，需要新增 Agent membership 模型，不能复用现有 token membership 表。
