# ADR-003 Coolify 部署保留宽 TRUSTED_PROXY_CIDRS 默认值

日期：2026-08-19
状态：已采纳

## 背景

API 服务依赖 `TRUSTED_PROXY_CIDRS` 判断可信任的 X-Forwarded-For 来源。Coolify 会把部署专属网络挂到每个服务上，web→api 流量的源 IP 可能落在任何无法预先钉死的子网。若默认收窄 CIDR，客户端真实 IP 会静默退化为容器 IP（限流与审计归因失真），且故障不明显。

## 决策

Coolify compose 保留覆盖部署网络的宽 `TRUSTED_PROXY_CIDRS` 默认值；需要收窄的部署使用 `scripts/ops/inspect-trusted-proxies.sh` 输出精确值（web 与 api 共享网络上 web 容器的 /32 列表），人工确认后覆盖。

## 后果

- 默认配置安全可运行，收窄是可审计的运维动作而非猜测。
- `docs/guides/coolify-deployment.md` 与 `production-security.md` 均引用该脚本。
- 2026-08-19 审计确认此权衡；`tests/ops` 的 XFF 契约测试守护代理链行为。
