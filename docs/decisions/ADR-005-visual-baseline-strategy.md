# ADR-005 截图基线策略

日期：2026-08-20
状态：已采纳

## 背景

历史移动端渲染问题（含移动端图表处理异常，发生于旧迭代）只能靠人工审计发现。e2e 的 mobile-chrome project 此前只重跑桌面功能断言，无渲染层防线。

## 决策

- 使用 Playwright 内建 `toHaveScreenshot`，不引入新依赖；
- 基线矩阵刻意收敛：`appRoutes` + `/login` 共 8 页 × `chromium`（Desktop Chrome）与 `mobile-chrome`（Pixel 7）× 仅 light 主题 = 16 张基线；webkit 跳过基线但仍跑全部功能测试；
- 环境钉死：UTC、en-US、`colorScheme: light`、next-themes 强制 light、reduced motion；
- 基线在 Linux 上录制并提交入库（`test/e2e/visual.spec.ts-snapshots/`）；阈值 `maxDiffPixelRatio: 0.01` / 像素 `threshold: 0.2`；
- 有意 UI 变更 → 同 PR `--update-snapshots` 重录并说明理由；UI 重建（ADR-004）合并后整体重录一次。

## 后果

- 移动端渲染破坏由 CI 必拦（故障演练已验证：仅移动端生效的 CSS 破坏使 mobile-chrome 全红而桌面全绿）。
- 每次有意 UI 变更承担一次显式重录成本——这是把隐性破坏转为显式审查的有意代价。
- 本地（非 Linux/字体不同）误红时，用阈值吸收或在容器内重录，不放宽阈值。
