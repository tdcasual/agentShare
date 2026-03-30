# Control Plane V3 前端修复任务清单

## P0 - 立即修复（阻塞性问题）

- [ ] **竞态条件修复** - `use-error-handler.ts`
  - 添加timeout清理ref
  - 在useEffect返回函数中清理

- [ ] **错误消息可访问性** - 所有页面
  - 添加`role="alert" aria-live="assertive"`
  - 文件: settings, tasks, tokens, reviews, assets

- [ ] **Input组件修复** - `input.tsx`
  - 生成唯一id关联label和input
  - 使用React.useId()

- [ ] **类型安全** - `tasks/page.tsx`
  - 移除双重类型断言
  - 添加zod schema验证

## P1 - 本周修复（重要改进）

### 国际化（i18n）
- [ ] 提取硬编码错误消息到翻译文件
  - tokens.form.*（15个键）
  - auth.errors.*（4个键）
  - tasks.errors.*（2个键）
  - reviews.errors.*（2个键）
  - assets.errors.*（2个键）

- [ ] 修复重复的hub.stats翻译键

### 性能优化
- [ ] 实现列表虚拟化
  - 安装`react-window`或`@tanstack/react-virtual`
  - 优先级: tasks > identities > tokens > settings

- [ ] 图片优化
  - 替换为Next.js Image组件
  - 文件: page.tsx, identities/page.tsx, avatar.tsx

- [ ] useMemo优化
  - settings/page.tsx
  - tasks/page.tsx
  - identities/page.tsx

## P2 - 计划修复（持续改进）

### 可访问性
- [ ] 图标按钮添加aria-label
- [ ] 验证颜色对比度
- [ ] 自定义选择按钮添加aria-pressed

### 类型系统
- [ ] 统一snake_case/camelCase类型定义
- [ ] 移除共享类型中的重复定义
- [ ] 使用类型守卫替代类型断言

### 代码质量
- [ ] 统一错误处理模式
- [ ] 添加schema验证层
- [ ] 引入ICU MessageFormat支持复数

## 验证清单

修复完成后验证：
- [ ] `npm run build` 无类型错误
- [ ] `npm run lint` 无警告
- [ ] 屏幕阅读器可正常播报错误消息
- [ ] 键盘可访问所有交互元素
- [ ] 长列表（>100项）滚动流畅
