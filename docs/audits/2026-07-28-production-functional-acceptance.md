# VaultGate 生产功能验收（2026-07-28）

## 1. 结论

生产站点 `https://ashare.infinitas.fun` 的部署、浏览器 UI、核心业务 API、权限隔离、审计、
性能和短时稳定性均通过实测。本轮未发现功能阻塞、5xx、异常堆栈或容器重启。

本轮最终结果为 **功能与管理员密码轮换全部通过**。管理员账号已存在且 bootstrap 已关闭；密码
通过隐藏输入的交互式轮换器写入，生产库确认哈希为合法 bcrypt 格式。轮换器随后在公网完成真实
登录和退出，审计记录分别为 `admin.login success` 与 `admin.logout success`，验证会话已撤销。
密码明文未写入仓库、报告、命令或代理工具输入。

## 2. 验收环境

| 项目 | 实际状态 |
|---|---|
| Coolify 资源 | `vaultgate` / `tr01vb13cz2sj4wrm4y009cr` |
| Coolify | `4.1.2`，控制面 `ready` |
| 生产镜像提交 | `f2313cef9384f41aa63b409e42f20f0e888d075d` |
| Web | 运行约 20 小时，`healthy` |
| API | 运行约 20 小时，`healthy` |
| PostgreSQL | 运行约 20 小时，`healthy` |
| Traefik 网络 | Web 精确绑定 `tr01vb13cz2sj4wrm4y009cr` |
| 就绪探针 | HTTP 200；database `ok`，encryption `ok` |
| 管理员初始化 | `setup_required=false` |
| 密码轮换验证 | bcrypt 合法；公网登录/退出成功；验证会话已撤销 |

## 3. 功能级结果

### 3.1 管理员认证与初始化

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| 首次初始化状态 | 通过 | bootstrap 已关闭，不能重复初始化 |
| 匿名管理端访问 | 通过 | `/api/admin/session` 返回 401 |
| 匿名 Vault 访问 | 通过 | `/api/vault/me` 返回 401 |
| Management Token 认证 | 通过 | 返回管理身份且 `auth_type=management_token` |
| 登录错误态与提交中禁用 | 通过 | Chromium、移动 Chrome、WebKit UI 用例通过 |
| 管理员密码登录 | 通过 | 2026-07-28 09:17:47 UTC 真实公网登录成功 |
| 登录后退出 | 通过 | 同一验证流程真实退出成功，会话已撤销 |
| 管理员密码修改入口 | 缺失 | 本次运维轮换完成，但产品仍无认证后修改 API/UI |

### 3.2 Management Token

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| 创建和一次性明文返回 | 通过 | 201，响应 `Cache-Control: no-store` |
| 列表与分页 | 通过 | limit/offset 与 total 契约正常 |
| Token 身份认证 | 通过 | 新签发 Token 可访问管理端 |
| 轮换 | 通过 | 新值可用，旧值立即 401 |
| 撤销 | 通过 | 撤销后新值立即 401 |
| 前端展示 | 通过 | 设置页列表和一次性明文提示三浏览器通过 |

### 3.3 Secret 管理

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| 加密创建 | 通过 | 两条随机值 Secret 均返回 201 |
| 列表、搜索、类型过滤 | 通过 | 名称搜索和 `password` 类型精确返回两条 |
| 元数据详情 | 通过 | tags/metadata 可正确读取，不返回明文值 |
| 更新 | 通过 | 描述字段修改后即时读取一致 |
| 管理员解密查看 | 通过 | 明文 round-trip 一致，响应 `no-store` |
| 密钥重加密流程 | 通过 | `/reencrypt` 返回合法更新计数 |
| 删除 | 通过 | 两条 Secret 均返回 204，随后数据库零残留 |

### 3.4 Agent 与 Agent Token

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| Agent 创建、详情和更新 | 通过 | 201/200，更新后字段一致 |
| Agent 状态过滤 | 通过 | active 过滤包含测试 Agent |
| 双 Token 签发 | 通过 | 两个 Token 独立签发且均为 `no-store` |
| Token 列表 | 通过 | Agent 下 total 为 2 |
| 独立 Secret Grant | 通过 | 两个 Token 分别仅绑定一条不同 Secret |
| Grant 保存与读取 | 通过 | PUT 后 GET 结果一致 |
| Token 轮换 | 通过 | 旧 Token 401，新 Token 可用 |
| Token 撤销 | 通过 | 两个 Token 均成功撤销 |
| 已撤销 Token 禁止轮换 | 通过 | 返回预期 409，不能“复活” |
| Agent 禁用 | 通过 | disabled 状态保存，仍有效 Token 被拒绝 |

### 3.5 Runtime Vault 权限

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| Agent 身份 | 通过 | `/me` 返回匹配的 Agent 和 Token |
| 最小权限列表 | 通过 | Token A 只看到其唯一授权 Secret |
| 授权元数据读取 | 通过 | 返回 200 且资源 ID 一致 |
| 未授权元数据读取 | 通过 | 跨 Grant 请求返回 403 |
| 未授权明文读取 | 通过 | 跨 Grant 请求返回 403 |
| 授权明文读取 | 通过 | 值完全一致且响应 `no-store` |
| 禁用/撤销后的访问 | 通过 | 均立即返回 401 |

### 3.6 审计

| 设计功能 | 结果 | 实测证据 |
|---|---|---|
| 审计动作目录 | 通过 | 包含 `secret.value.read` |
| 成功访问记录 | 通过 | 列表、元数据和明文访问写入成功记录 |
| 越权拒绝记录 | 通过 | 两次跨 Grant 请求均可按资源 ID 查询 |
| 审计筛选 | 通过 | result/resource_id 组合筛选正常 |
| 审计统计 | 通过 | denied 和 value_reads 计数包含本轮事件 |

## 4. 浏览器与界面

密码轮换后，生产域名重新执行 **69 项**，结果 **69 passed**：

- Desktop Chromium、Pixel 7 Mobile Chrome、Desktop Safari/WebKit 全部通过。
- Dashboard、Secrets、Agents、Audit、Management Tokens 和 Docs 导航正常。
- Agent 切换 Token 时的未保存 Grant 保护正常。
- 登录成功、错误凭据、API 不可用、提交中禁用和退出行为正常。
- 五个核心页面 axe WCAG A/AA 自动检查无违规。
- CSP nonce 用例通过，框架和主题脚本未被生产 CSP 阻止。

这些 UI 用例在生产域名加载真实页面、资源和 CSP，但业务数据由 Playwright route mock 提供；
因此本报告另以第 3 节的 **50 项真实生产 API 操作**验证后端和数据库；密码轮换后又执行
**36 项真实生产 API 回归**，二者不与 UI Mock 混为一谈。

## 5. 安全响应与性能

安全响应头实测包含 HSTS、nonce CSP、`frame-ancestors 'none'`、`X-Frame-Options: DENY`、
`X-Content-Type-Options: nosniff`、严格 referrer policy 和受限 permissions policy。

| 场景 | TTFB | FCP | LCP | CLS | INP | 结果 |
|---|---:|---:|---:|---:|---:|---|
| Desktop Chrome | 483.2ms | 648ms | 1224ms | 0 | 24ms | 通过 |
| Pixel 7 | 326.5ms | 468ms | 468ms | 0 | 24ms | 通过 |

密码轮换后低强度只读负载为 100 请求、并发 10：失败 0，P50 `96.6ms`，P95 `253.9ms`，
P99 `316.7ms`。该结果只代表短时健康端点基线，不等同于容量测试或写负载压测。

## 6. 清理与日志

- 临时 Management Token：0。
- 临时 Secret：0。
- 临时 Agent：0。
- 临时 Idempotency Record：0。
- 密码轮换后回归产生的临时 Management Token、Secret 和 Agent：均为 0。
- 测试后 `/readyz` 仍为 200，数据库和加密服务均为 `ok`。
- 密码轮换后测试窗口的 API/Web 错误日志匹配数均为 0。
- 测试窗口内未发现 5xx、Traceback、未处理异常或容器重启。
- 401、403 和 409 均为权限边界测试的预期结果。
- 审计日志按产品设计保留，未作为临时业务数据删除。

## 7. 已关闭风险与当前问题

### 已关闭 High：管理员弱密码风险

密码已通过隐藏输入完成轮换。数据库确认唯一管理员的密码哈希为合法 bcrypt 格式；2026-07-28
09:17:47 UTC 的真实公网登录和退出均成功，过去一小时唯一验证会话为 revoked。此前 High 风险
关闭，报告不记录密码或哈希。

### Medium：缺少认证后的密码修改功能

系统只支持 bootstrap 创建密码和 session 登录，没有“当前密码 + 新密码”的修改接口、UI、审计
动作和会话撤销流程。这使日常密码轮换依赖数据库运维，是实际产品功能缺口。建议补齐：

1. 仅允许 session 身份调用的密码修改 API。
2. 校验当前密码和与 bootstrap 相同的新密码策略。
3. 更新 bcrypt hash 后撤销该用户全部其他 Session。
4. 写入不含敏感字段的 `admin.password.change` 审计记录。
5. 在设置页增加密码修改表单、错误态和成功后重新登录流程。

## 8. 验收状态

| 范围 | 状态 |
|---|---|
| 部署与健康 | 通过 |
| UI 与响应式 | 通过 |
| 核心业务 API | 通过（原验收 50/50；轮换后 36/36） |
| 权限与审计 | 通过 |
| 性能与短时稳定性 | 通过 |
| 测试数据清理 | 通过 |
| 新管理员密码 | **轮换完成，真实登录/退出通过** |
| 综合结论 | **Pass** |
