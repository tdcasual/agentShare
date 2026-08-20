# VaultGate Agent 就绪：详细实施计划

日期：2026-08-20
状态：已完成（P1-P3 已落地）
范围：设计文档 `2026-08-20-agent-readiness-and-scenario-testing.md` 的逐文件实施步骤、代码草案、命令序列、阶段验收与回退方案。实施前审计结论见第 0 节。

## 0. 实施前审计（2026-08-20，已对照仓库逐项核实）

### 0.1 对设计文档的修正（已回填设计文档）

| # | 原表述 | 事实 | 修正 |
|---|---|---|---|
| A1 | "移动端零自动化防线" | `test/e2e/accessibility.spec.ts` 已存在：7 条路由 axe WCAG A/AA + 一条 320px 视口测试 | 改为"仅单视口无障碍扫描，无布局/渲染断言、无截图基线" |
| A2 | visual.spec 页面清单为 6 页 | accessibility.spec 已有 7 路由清单（含 `/agents`、`/spaces`） | 提取共享 `appRoutes` 常量，visual.spec = appRoutes + `/login` |
| A3 | 快速回路 6 项 | `verify-control-plane.sh` 实际链路含 `check_migration_policy.py`、`check:api-types`、`test:coverage`，均便宜且是 agent 高频翻车点 | 快速回路改为"完整回路 − 浏览器/构建/部署配置" |

### 0.2 新增的稳定性约束（设计文档遗漏，本计划落实）

| # | 事实 | 约束 |
|---|---|---|
| B1 | 前端用 `next-themes`，存在暗色模式 | visual.spec 必须钉死 light：`addInitScript` 写 `localStorage.theme='light'` + `colorScheme: 'light'` |
| B2 | 日期来自固定 fixture 但渲染经 locale/时区 | `test.use({ timezoneId: 'UTC', locale: 'en-US' })` |
| B3 | `test:integration`（playwright.integration.config.ts）存在但未接入 verify/CI | 记录为门禁孤儿，本期只在 AGENTS.md 标注"不在合并门禁内"，不改行为 |
| B4 | 全仓库 grep 无任何图表库/图表组件 | 历史"移动端图表"问题属旧迭代；基线防御对象为布局/表格/导航；"含图表页面须登记基线"条款保留为前瞻性规则 |

### 0.3 可行性确认（已验证）

- `fixtures.mockSession` 全确定性（固定时间戳 2024-01-01 等），非 GET 统一 200/204，截图可直接复用；
- `@playwright/test ^1.61.1`，`toHaveScreenshot` 与 clock API 可用；CI 已 `playwright install chromium webkit`，**CI 无需改动**；
- pytest 覆盖率门禁 `--cov=app --cov-fail-under=80` 在 `apps/api/pyproject.toml` addopts，快速回路跑 pytest 自动继承；
- vitest exclude `test/e2e`，新建 `src/i18n/messages.test.ts` 会被收集；覆盖率棘轮只升不降，新增测试只会抬高基线；
- lint/prettier 覆盖 `src test playwright*.config.ts`，新文件自动进入 `npm run check`；
- `.github/` 有 CODEOWNERS 与 4 个 workflow，无 PR 模板，可直接新建；
- e2e 就绪信号：`#main-content`（layout.tsx 锚点，accessibility.spec 已用）；登录路由 `/login`（login.spec.ts 已用）。

## 1. P1：入口文档 + 机器门禁补强（约 1 天）

### 1.1 根级 `AGENTS.md`（新建）

章节骨架（每节内容要点，实施时按此展开）：

1. **项目速览**：一句话定位；FastAPI + async SQLAlchemy / Next.js 16 / PG(prod)·SQLite(dev)；三类凭据 `vgs_`（会话 Cookie）/`vgm_`（管理）/`vg_`（agent）及"前缀双向强制、边界失败关闭"。
2. **仓库地图**：`apps/api/app/modules/{admin_auth,audit,access,spaces,tokens,...}`、`apps/api/app/orm.py`、`apps/control-plane-v3/src/{app,components,i18n,lib}`、`scripts/ops`、`tests/ops`（部署契约）、`docs/{guides,plans,audits,decisions}`。
3. **验证回路**：迭代用 `./scripts/ops/verify-fast.sh`；合并前 `./scripts/ops/verify-control-plane.sh` 必须全绿（首次运行先 `./scripts/ops/bootstrap-dev-runtime.sh` + `npm ci`）。明确：`test:integration` 不在门禁内，不得以其替代 e2e。
4. **架构红线**（9 条，逐条附执行机制）：
   | 红线 | 执行机制 |
   |---|---|
   | `/api/admin/*` 与 `/api/vault/*` 边界双向失败关闭 | 现有测试 + 评审 |
   | 授权只走 `modules/access/service.py` 或属主校验 | 评审 + AGENTS.md |
   | 默认拒绝：无 grant 的凭据读不到任何 Secret | 现有测试（test_space_collaboration outsider 断言） |
   | 新审计动作先注册 `AUDIT_ACTIONS` | 运行时 ValueError + 评审 |
   | 禁隐式 tag 授权、禁遗留兼容路由 | CONTRIBUTING 原文 + 评审 |
   | Vault 写端点强制 `Idempotency-Key`（缺失 422） | 现有测试 |
   | i18n 必须 zh-CN/en 同步 | **P1 新增测试强制** |
   | 改 API 必须 `npm run generate:api-types` | `check:api-types` 门禁 |
   | 数据库变更走 Alembic 且保留数据 | `check_migration_policy.py` + 评审 |
5. **新场景清单**：设计文档 3.2 节全文内嵌。
6. **模式索引**（"要做 X，抄哪里"）：
   - 新管理端模块 → `app/modules/spaces/`（routes + 审计 + 409 并发）；
   - 新管理端端点测试 → `tests/test_admin_api.py` 中 `test_revoke_all_tokens_*` 系列；
   - 并发冲突测试写法 → `tests/test_space_collaboration.py::test_concurrent_membership_replace_conflict_returns_409`（patch `AsyncSession.commit`）；
   - 新前端页面 → `src/app/settings/security/page.tsx` + `page.test.tsx`；
   - 新 e2e → `test/e2e/security-settings.spec.ts` + `fixtures.ts`；
   - 视觉基线登记 → `test/e2e/visual.spec.ts` 的 `appRoutes`。
7. **决策记录索引**：`docs/decisions/` ADR 列表（P3 落地后回填链接）。
8. **当前状态**：控制面 UI 为过渡版，shadcn/ui 重建在 `ui/shadcn-rebuild` 分支（Phase 2 页面迁移待续）；新场景前端按现行模式实现、不过度打磨；截图基线重建后统一重录。
9. **文档义务**：代码赢文档；改配置同步 `docs/guides` 环境变量表；新增公开 API 更新 README API 表；改红线同 PR 改本文件。

### 1.2 `CLAUDE.md`（符号链接）

```bash
ln -s AGENTS.md CLAUDE.md
```

git 正常跟踪符号链接；OpenClaw/Hermes 读 AGENTS.md。

### 1.3 `src/i18n/messages.test.ts`（新建，代码草案）

```ts
import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import zhCN from './messages/zh-CN.json';

type MessageTree = { [key: string]: string | MessageTree };

function flatten(tree: MessageTree, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') leaves.set(path, value);
    else for (const [k, v] of flatten(value, path)) leaves.set(k, v);
  }
  return leaves;
}

const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n message parity', () => {
  const zh = flatten(zhCN as MessageTree);
  const english = flatten(en as MessageTree);

  it('zh-CN and en expose identical key trees', () => {
    expect([...zh.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('has no empty values', () => {
    for (const [key, value] of [...zh, ...english]) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('keeps interpolation placeholders aligned across locales', () => {
    for (const [key, value] of zh) {
      expect(placeholders(value), key).toEqual(placeholders(english.get(key)!));
    }
  });
});
```

实施注意：确认 `i18n` 模块实际 import JSON 的方式与本测试一致（`resolveJsonModule` Next.js 默认开启）；若现有 i18n 封装有额外 locale（ unlikely），扩展为 N 方对齐。

### 1.4 `scripts/ops/verify-fast.sh`（新建，需 chmod +x）

定义：**完整回路 − 浏览器测试 − 构建 − 部署配置检查**。草案（结构镜像 `verify-control-plane.sh`）：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERIFY_PYTHON="${VERIFY_PYTHON:-${ROOT_DIR}/.venv/bin/python}"

if [ ! -x "${VERIFY_PYTHON}" ]; then
  printf 'Missing Python runtime at %s\n' "${VERIFY_PYTHON}" >&2
  printf 'Run ./scripts/ops/bootstrap-dev-runtime.sh first.\n' >&2
  exit 1
fi

(
  cd "${ROOT_DIR}/apps/api"
  PYTHONPATH=. "${VERIFY_PYTHON}" -m mypy app/
)

(
  cd "${ROOT_DIR}"
  PYTHONPATH=apps/api "${VERIFY_PYTHON}" -m ruff check apps/api/app apps/api/tests
  "${VERIFY_PYTHON}" scripts/ops/check_migration_policy.py
  PYTHONPATH=apps/api "${VERIFY_PYTHON}" \
    "${ROOT_DIR}/scripts/ops/run-pytest.py" apps/api/tests tests/ops -q
)

(
  cd "${ROOT_DIR}/apps/control-plane-v3"
  npm run check:api-types
  npm run typecheck
  npm run lint
  npm test -- --run
  npm run test:coverage
)

printf 'Fast verification passed.\n'
printf 'NOTE: browser tests (e2e/a11y/visual/performance), the production\n'
printf 'build, and deploy-config checks are NOT included. Run\n'
printf 'scripts/ops/verify-control-plane.sh before merging.\n'
```

### 1.5 `.github/PULL_REQUEST_TEMPLATE.md`（新建）

```markdown
## 变更说明

## 检查清单
- [ ] 后端：认证边界/授权/审计/冲突路径测试齐全（见 AGENTS.md 新场景清单）
- [ ] 前端：i18n zh-CN 与 en 同步；已跑 `npm run generate:api-types`
- [ ] 前端新/改页面：e2e 含至少一条移动端断言；已登记 visual.spec 基线
- [ ] 部署/配置变更：tests/ops 契约与环境变量表同步
- [ ] `scripts/ops/verify-fast.sh` 与 `scripts/ops/verify-control-plane.sh` 全绿
- [ ] 受影响文档已更新（guides/README/AGENTS.md/ADR）
```

### 1.6 P1 验收

| 演练 | 命令 | 期望 |
|---|---|---|
| 删除 `en.json` 任一 key | `cd apps/control-plane-v3 && npm test -- --run` | 红（parity 测试失败） |
| 快速回路独立可用 | `./scripts/ops/verify-fast.sh` | 绿，且尾部打印"不含浏览器测试"提示 |
| 符号链接生效 | `cat CLAUDE.md` | 内容等于 AGENTS.md |

## 2. P2：移动端与视觉回归门禁（约 2 天）

### 2.1 `test/e2e/fixtures.ts`：共享路由 + 移动端断言助手

```ts
// 与 accessibility.spec.ts 共用；新增页面只改这一处
export const appRoutes = [
  '/', '/agents', '/secrets', '/spaces',
  '/audit', '/settings/security', '/settings/management-tokens',
] as const;

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, 'page must not overflow horizontally').toBeLessThanOrEqual(0);
}
```

同步改 `accessibility.spec.ts`：`routes` 本地常量替换为 `import { appRoutes }`（320px 特例测试保留）。fixtures.ts 需新增 `import { expect } from '@playwright/test'`。

### 2.2 `test/e2e/visual.spec.ts`（新建，代码草案）

```ts
import { expect, test } from '@playwright/test';
import { appRoutes, assertNoHorizontalOverflow, mockSession, mockUnauthenticated } from './fixtures';

// 环境钉死：基线只追代码变化，不追 OS 主题/时区/locale
test.use({
  timezoneId: 'UTC',
  locale: 'en-US',
  colorScheme: 'light',
  reducedMotion: 'reduce',
});

// 基线矩阵刻意收敛：桌面 + Pixel 7；webkit 项目继续跑全部功能 spec
test.skip(({ browserName }) => browserName === 'webkit', 'visual matrix is chromium + mobile-chrome only');

const screenshotName = (route: string) =>
  `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}.png`;

test.describe('visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    // next-themes：钉死 light，防止基线跟随系统主题
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  });

  test('/login renders a stable baseline', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/login');
    await expect(page.locator('#main-content, main').first()).toBeVisible();
    await expect(page).toHaveScreenshot(screenshotName('/login'), { fullPage: true });
    await assertNoHorizontalOverflow(page);
  });

  for (const route of appRoutes) {
    test(`${route} renders a stable baseline`, async ({ page }) => {
      await mockSession(page);
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page).toHaveScreenshot(screenshotName(route), { fullPage: true });
      await assertNoHorizontalOverflow(page);
    });
  }
});
```

实施注意：
- 基线规模：8 页 × 2 project = **16 张**；
- 若某长页面 fullPage 截图出现滚动相关不稳定（sticky 元素），降级为该页 viewport-only，并在 spec 内注释原因；
- 登录页就绪选择器以 login.spec.ts 实际用法为准（草案用 `#main-content, main` 兜底，实施时收窄）。

### 2.3 `playwright.config.ts`：统一阈值

在现有 config 增加（与草案一致）：

```ts
expect: {
  toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2 },
},
```

不引入 `snapshotPathTemplate`，用默认按 project 分目录（`test/e2e/visual.spec.ts-snapshots/`）。

### 2.4 基线录制与维护流程

- **首次录制**（必须在与 CI 相同的 Linux 环境，避免本地 macOS 字体差异入库）：

```bash
docker run --rm --init -v "$PWD:/work" -w /work/apps/control-plane-v3 \
  mcr.microsoft.com/playwright:v1.61.1-jammy \
  bash -lc "npm ci && npx playwright test visual.spec.ts --update-snapshots"
```

（或直接在首次 CI 运行后用 `git checkout` 取回；二选一，实施时以可行者为准。）
- 基线目录 `test/e2e/visual.spec.ts-snapshots/**` **提交入库**；确认 `.gitignore` 未忽略 `*-snapshots`。
- 有意 UI 变更：同 PR `--update-snapshots` 重录 + PR 说明理由；基线 diff 即审查对象。
- UI 重建（`ui/shadcn-rebuild`）合并后一次性整体重录。

### 2.5 P2 验收（故障演练）

| 演练 | 步骤 | 期望 |
|---|---|---|
| 移动端-only 破坏必被拦 | 在 `globals.css` 注入 `@media (max-width: 768px){ #main-content { width: 150vw; } }`，跑 `npx playwright test visual.spec.ts` | chromium 基线绿、**mobile-chrome 红**（证明视口区分度），随后还原 |
| 横向溢出助手有效 | 同上注入后跑含 `assertNoHorizontalOverflow` 的 spec | 红 |
| CI 无需改动 | 检查 ci.yml | 既有 `playwright install chromium webkit` + verify-control-plane.sh 已覆盖新 spec |

## 3. P3：文档同步与决策固化（约 1 天）

### 3.1 架构设计文档状态横幅

`docs/plans/2026-07-13-vaultgate-architecture-design.md` 标题下插入：

> **状态说明（2026-08-20）**：本文为 2026-07-13 基线设计，不含 Vault Spaces（2026-07-20 上线）。Spaces 设计见 `2026-08-20-vault-spaces-design.md`。文档与代码冲突时，以代码与测试为准。

### 3.2 `docs/plans/2026-08-20-vault-spaces-design.md`（新建，反推补写）

章节与证据来源：

1. 目标与角色模型（reader/contributor/maintainer）← `app/modules/spaces/` + `tests/test_space_collaboration.py`；
2. 数据模型（spaces、memberships、归档状态、SpaceTokenMembership 唯一约束）← `app/orm.py` + 对应 Alembic 迁移；
3. 授权语义：space 访问源、permissions 派生（read / read+update）、maintainer 权限矩阵 ← 测试断言；
4. 生命周期：归档即拒绝访问、成员整体替换、吊销即时生效 ← `test_maintainer_revocation_and_archiving_take_effect_immediately`；
5. 迁移与重名处理 ← 迁移脚本 + `check_migration_policy.py`；
6. 不变量清单（默认拒绝、租户属主过滤 ← `test_space_membership_rejects_another_tenants_token`）。

### 3.3 `docs/decisions/`（新建目录 + README + 5 条 ADR）

README 规定格式：`ADR-NNN-标题.md`，含 日期/状态/背景/决策/后果。首批：

| 编号 | 决策 | 来源 |
|---|---|---|
| ADR-001 | Secret 名称全局唯一；接受存在性旁路作为已记录权衡 | 2026-08-19 审计 |
| ADR-002 | 改密不连带吊销管理/agent Token；应急补位为 revoke-all 端点 | 2026-08-19 审计 + 4cd6c88 |
| ADR-003 | Coolify 保留宽 `TRUSTED_PROXY_CIDRS` 默认值；收窄用 `inspect-trusted-proxies.sh` | 4cd6c88 |
| ADR-004 | 控制面 UI 为过渡版；重建在 `ui/shadcn-rebuild`（Phase 2 页面迁移待续） | 项目记忆/分支状态 |
| ADR-005 | 截图基线策略：8 页 × chromium+mobile-chrome × light；CI 生成；UI 重建后整体重录 | 本方案 |

完成后回填 AGENTS.md 第 7 节索引链接。

### 3.4 P3 验收

- 冷读者只凭 AGENTS.md 的模式索引能定位全部范本文件（人工走查一遍）；
- Spaces 设计文档中每条不变量都能指认一个测试或代码位置。

## 4. P4：冷启动演练（约 0.5 天）

协议：

1. 使用**未参与本方案**的干净 agent 会话（新 Claude Code 会话，或 OpenClaw/Hermes 任一）；
2. 下发设计文档 3.6 节的任务提示词模板，任务定为样例场景：
   > 为 Agent Token 列表增加"仅显示即将到期（30 天内）"的过滤参数 `expires_within_days`，前后端打通。
3. 人工不干预，只记录偏离点；
4. 通过标准：完整回路一次全绿 + 检查清单各项（i18n 双语、generated-api、移动端断言、visual 基线登记、审计字段如涉及）无遗漏；
5. 发现的流程断点 → 回填 AGENTS.md / 清单（小 commit）。

## 5. 提交计划

| 阶段 | 提交（直接 main，延续当前工作流；如需分支再议） | 内容 |
|---|---|---|
| P1 | `docs+test: add AGENTS.md entry doc, i18n parity gate, fast verify loop, PR template` | AGENTS.md、CLAUDE.md、messages.test.ts、verify-fast.sh、PULL_REQUEST_TEMPLATE.md |
| P2 | `test: add dual-viewport visual baselines and mobile overflow assertions` | fixtures 改动、visual.spec.ts、基线目录、playwright.config expect 块 |
| P3 | `docs: add Vault Spaces design doc, ADRs, architecture baseline banner` | 3.1–3.3 全部文件 |
| P4 | 演练本身不产生提交；回填以小 commit 跟进 | — |

注意：当前 main 尚有 1 个未推送提交（4cd6c88）；是否先推送由用户决定。

## 6. 验收总矩阵

| # | 演练 | 期望 | 阶段 |
|---|---|---|---|
| 1 | 删 en.json 任一 key | 快速回路红 | P1 |
| 2 | 注入移动端-only CSS 破坏 | mobile-chrome 基线红、桌面绿 | P2 |
| 3 | 忘记 `generate:api-types` | `check:api-types` 红（既有，回归确认） | P1/P2 |
| 4 | 冷启动 agent 样例场景 | 完整回路一次全绿、清单无遗漏 | P4 |
| 5 | 每条红线 | 存在机器门禁或明确评审核对点（见 AGENTS.md 红线表） | P1 |

## 7. 回退与风险

- 各阶段独立成 commit，可单独 revert；
- 截图基线若维护成本超预期：`git rm -r test/e2e/visual.spec.ts-snapshots visual.spec.ts` 即可整体下线，其余门禁不受影响；
- visual.spec 在 CI 首跑可能因字体/抗锯齿差异微红：用阈值吸收，仍红则在容器内重录，不改 CI 配置；
- AGENTS.md 腐化：PR 模板最后一项 + 每次安全审计将其准确性纳入检查范围；
- `test:integration` 门禁孤儿：本期只标注；是否并入 verify 链另立议题，避免本期扩大改动面。
