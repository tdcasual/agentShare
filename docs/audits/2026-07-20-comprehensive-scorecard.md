# VaultGate 全面评分式审计（2026-07-20）

方式：五路独立审计实例并行（安全、代码质量与架构、测试与可靠性、UI/UX 与可访问性、文档与部署运维），全部结论以当前代码逐条核实（文件:行号），非复述历史报告。评分口径：10=范本；9=优秀仅打磨项；8=良好少量低风险缺口；7=合格有中风险缺口；≤6=存在高/中危。

## 总评：**7.8 / 10（良好偏上）**

| 维度 | 评分 | 一句话结论 |
|---|---|---|
| 安全 | **7.5** | Caddy 生产路径接近范本级；Coolify 路径的代理信任过宽拉低总分 |
| 代码质量与架构 | **8.5** | 契约自动化、模块边界、幂等基础设施优秀；依赖声明有一处客观错误 |
| 测试与可靠性 | **8.0** | 后端测试密度与回归纪律优秀；前端覆盖率无门禁是关键缺口 |
| UI/UX 与可访问性 | **7.5** | 设计系统与 i18n 接近范本级；dashboard 把加载失败误报为"健康" |
| 文档与部署运维 | **8.0** | 20+ 条一致性抽查全中、四拓扑覆盖；Coolify 就绪探针按文档照做不能成 |

总体 = 安全 ×1.5 加权平均 7.77 ≈ 7.8。无高/中危未修复项；全部扣分点均为中/低风险且有明确修法。

## 各维度要点

### 安全 7.5/10
强项：三凭据（session/vgm_/vg_）严格隔离、授权默认拒绝且越权 404；bcrypt cost 12 + 虚拟哈希均衡时序；AES-256-GCM 随机 nonce + v2 信封 keyring 轮换；限流持久化 + 归一化 + 429 防自锁；审计拒绝落库 + 截断 + 防写放大 + 导出哈希链；XFF 信任链（Caddy 覆盖 + 仅信静态 IP + 代理压单条）；供应链（715 哈希、digest 钉版、Trivy 门、容器加固全家桶）。
扣分：
- **−1.5** `docker-compose.coolify.yml:88` 默认 `TRUSTED_PROXY_CIDRS=172.16.0.0/12`：Coolify 共享网络上任意容器可直连 api 伪造 XFF，绕过登录限流并污染审计（中风险，默认配置即生效）。
- **−0.5** `client_ip.py:27` 取 XFF 最左条目，语义与"入站恰好一条"强耦合，换追加式前置即破防。
- **−0.5** 低风险累积：login/bootstrap 无 Origin 校验（理论 login CSRF）、无密码修改/批量会话撤销端点、429 期间攻击审计不可见（知情权衡）、过期数据清理仅启动时执行、审计查询 API 不返回 IP/UA、Coolify 拓扑下 CSP 退化为 `unsafe-inline`。

### 代码质量与架构 8.5/10
强项：质量门单入口（verify 脚本 = CI）；OpenAPI↔TS 契约逐字节同步且有 CI 门；Settings 单一来源含生产强校验；ApiError/HTTPException 错误模型统一；幂等一等基础设施；SWR 竞态显式处理；模块依赖无环。
扣分：
- **−0.5** `pyproject.toml:24` 声明了无人使用的 `httpx2`，而真正被 `fastapi.testclient` 需要的 `httpx` 仅靠 lock 隐式存在（依赖健康实锤错误）。
- **−0.5** mypy 未开 `disallow_untyped_defs`；`admin_auth/routes.py:93` 唯一的 `type: ignore` 掩盖错误的返回注解（429 JSONResponse vs dict）。
- **−0.5** ManagementToken 序列化重复三处、`SecretType` 前端手写数组无 parity 测试、i18n key 无类型约束、若干风格小疵。

### 测试与可靠性 8/10
强项：后端 80% 覆盖门禁实测生效（当前 90.56%）；07-19/20 全部修复均有回归测试（含反向验证）；真实全栈集成测试在 CI 强制执行；API 测试用真实迁移+真实加密、断言行为；镜像流水线扫所建即所推 fail-fast。
扣分：
- **−1** 前端覆盖率无阈值（`vitest.config.ts` 无 thresholds），且核心页面薄弱：secrets 36%、agents 40%、agent-token-workspace 35%（刚被修复两次的组件）。
- **−0.5** E2E 全部网络层 mock 且旁路 proxy；真实栈测试不走浏览器。
- **−0.5** `db.py` 陈旧 dev 库自动恢复分支零测试；ops 脚本只验字符串不执行（无 shellcheck/drill 入 CI）。

### UI/UX 与可访问性 7.5/10
强项：OKLCH 双层语义 token、明暗各调；触控 ≥44px、safe-area、底栏避让；audit 双视图；三态密度高且骨架拟形；skip link/aria-live/aria-pressed/reduced-motion/contrast 媒体查询成体系；i18n 332/332 零漂移、函数式插值；dirty-guard 三路拦截；确认流双击防护+看门狗。
扣分：
- **−1** `app/page.tsx:24-34` dashboard 三个 hook 未接 `error`：API 失败时安全状态区显示绿色"未发现拒绝访问"——安全控制台把故障误报为健康（中风险）。
- **−0.5** 深色模式 destructive 按钮文字对比度实测 3.74:1（`globals.css:75-76`），不达 AA 4.5:1，影响全部删除/吊销确认键。
- **−0.5** management-tokens 一次性 Token 横幅埋在 25 行列表之后（页底），无焦点移动/live region。
- **−0.25** 浅色 `text-status-success` 小字 3.86:1。 **−0.25** 两处列表错误态无重试、文案/图标小不一致打包。

### 文档与部署运维 8/10
强项：零死链；20+ 条文档-代码一致性抽查全中；四拓扑覆盖且边界写明；Coolify 指南与 compose 逐条吻合且有契约测试；监控告警与规则逐条一致；审计索引+口径完整。
扣分：
- **−1** Coolify 拓扑下 `https://<domain>/healthz|/readyz` 恒定 404（流量全打 web，Next 无该路由）——指南冒烟与 blackbox 监控探针照做不能成（critical 告警会常火）。
- **−0.5** ops 脚本无条件 `--env-file .release.env`（deploy.yml 生成的未跟踪文件），Coolify 主机/手工部署照抄文档即报错。
- **−0.5** 恢复 runbook 为散文级：`restore-postgres.sh` 强制 `BACKUP_FILE`，文档无一条完整恢复命令示例。
- 打磨：`.release.env`/`.resolved-release.env` 未入 `.gitignore`。

## 改进优先级（若继续修复）

1. dashboard 错误态诚实化（hook 接 error，失败时中性提示+重试，不再显示虚假绿色）——安全产品 UI 不能说谎。
2. Coolify compose 内部隔离网络（web 双网络、api/postgres 仅内部），代理信任面随之收敛；同步更新契约测试。
3. Next 增加 `/healthz`、`/readyz` 直通路由（或指南改 blackbox 入 compose 网络探 api:8000）。
4. `pyproject.toml` 删 `httpx2` 补 `httpx` 并重生成 dev lock；mypy 开 `disallow_untyped_defs` 并修正 login 返回注解。
5. vitest 覆盖率阈值（ratchet：整体锚定现状，薄页面单独设底线）。
6. 深色 destructive 对比度修正（token 调整至 ≥4.5:1）；management-tokens 一次性横幅移至列表上方。
7. ops 脚本对缺失 `.release.env` 容错（存在才传参）；恢复 runbook 补完整命令；`.gitignore` 补两个 release env 文件。
