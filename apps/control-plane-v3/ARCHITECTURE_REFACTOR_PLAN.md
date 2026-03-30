# Control Plane V3 架构重构计划

## 📋 执行概览

```
Phase 1 (2-3天): 架构修复 → Phase 2 (3-5天): 解耦重构 → Phase 3 (2-3天): 基础设施 → Phase 4 (3-5天): 测试
```

---

## Phase 1: 架构修复 (2-3 天)

### Day 1: 修复 Core 层依赖方向

**目标**: 移除 `core/runtime.ts` 中的硬编码 Domain 依赖

**步骤**:
1. [ ] 复制 `src/core/runtime-refactored.ts` 到 `src/core/runtime.ts`
   - 新的 `createCoreRuntime` 接受 `plugins` 参数
   - `initializeRuntime` 改为接收插件列表
   - 添加 `RuntimeContext` 和 `useRuntime` hook

2. [ ] 修改 `src/app/layout.tsx`
   ```typescript
   // 在根组件初始化 Runtime
   import { IdentityDomainPlugin } from '@/domains/identity/plugin';
   
   const runtime = createCoreRuntime({
     plugins: [new IdentityDomainPlugin()],
   });
   await initializeRuntime(runtime);
   
   // 通过 Context 提供
   <RuntimeContext.Provider value={runtime}>
     {children}
   </RuntimeContext.Provider>
   ```

3. [ ] 验证构建
   ```bash
   npm run build
   ```

### Day 2-3: 重构 Layout 组件

**目标**: 使用新的 hooks 替代直接 Runtime 调用

**步骤**:
1. [ ] 复制 `src/hooks/use-identity.ts` 到项目
2. [ ] 修改 `src/interfaces/human/layout/index.tsx`
   - 使用 `useIdentities()` hook
   - 移除 `getRuntime()` 调用
   - 移除 `initializeRuntime()` 调用
3. [ ] 添加错误边界和加载状态
4. [ ] 更新所有使用 Layout 的页面

**文件清单**:
- `src/interfaces/human/layout/index.tsx`
- `src/app/page.tsx` (移除直接 Runtime 调用)
- `src/app/identities/page.tsx` (移除直接 Runtime 调用)

---

## Phase 2: 解耦重构 (3-5 天)

### Day 4-5: 拆分 IdentityRegistry

**目标**: 将大服务拆分为职责单一的小服务

**当前问题**:
```typescript
class IdentityRegistryImpl {
  // 5个职责混在一起
}
```

**目标结构**:
```
src/domains/identity/
├── services/
│   ├── identity-repository.ts      # 数据持久化
│   ├── identity-search-service.ts  # 搜索过滤
│   ├── presence-manager.ts         # 在线状态
│   └── identity-registry-facade.ts # 协调 facade
```

**步骤**:
1. [ ] 创建 `IdentityRepository` 类
2. [ ] 创建 `IdentitySearchService` 类
3. [ ] 创建 `PresenceManager` 类
4. [ ] 重构 `IdentityRegistryImpl` 使用组合
5. [ ] 更新所有依赖方

### Day 6-7: 重构 Pages 使用 Hooks

**目标**: 所有 Page 组件通过 hooks 获取数据

**文件清单**:
- [ ] `src/app/page.tsx`
- [ ] `src/app/identities/page.tsx`
- [ ] `src/app/spaces/page.tsx`
- [ ] `src/app/tasks/page.tsx`
- [ ] `src/app/assets/page.tsx`
- [ ] `src/app/tokens/page.tsx`
- [ ] `src/app/reviews/page.tsx`
- [ ] `src/app/settings/page.tsx`

**每个文件的修改模式**:
```typescript
// 之前
const runtime = getRuntime();
const registry = runtime.di.resolve(IdentityRegistryServiceId);

// 之后
const { identities, isLoading } = useIdentities();
```

---

## Phase 3: 基础设施完善 (2-3 天)

### Day 8: 引入 API 缓存层

**目标**: 使用 SWR 优化 API 调用

**步骤**:
1. [ ] 安装依赖
   ```bash
   npm install swr
   ```

2. [ ] 创建 `src/lib/swr-config.ts`
   ```typescript
   import { SWRConfig } from 'swr';
   
   export const swrConfig = {
     provider: () => new Map(),
     isOnline: () => typeof navigator !== 'undefined' ? navigator.onLine : false,
     isVisible: () => true,
   };
   ```

3. [ ] 创建 `src/hooks/use-api.ts`
   ```typescript
   import useSWR from 'swr';
   import { api } from '@/lib/api';
   
   export function useAgents() {
     return useSWR('/agents', () => api.getAgents(), {
       revalidateOnFocus: false,
       dedupingInterval: 2000,
     });
   }
   ```

4. [ ] 替换 Tasks 页面中的直接 API 调用

### Day 9: 统一错误处理

**目标**: 建立全局错误处理策略

**步骤**:
1. [ ] 扩展 `ApiError` 类
   ```typescript
   export enum ErrorType {
     NETWORK = 'NETWORK',
     AUTH = 'AUTH',
     VALIDATION = 'VALIDATION',
     SERVER = 'SERVER',
   }
   ```

2. [ ] 创建 `src/hooks/use-api-error.ts`
   ```typescript
   export function useApiErrorHandler() {
     return {
       handle: (error: ApiError) => {
         // 根据错误类型处理
       }
     };
   }
   ```

3. [ ] 添加全局 Toast 通知

### Day 10: 类型定义按领域拆分

**目标**: 将 `src/shared/types/index.ts` 按领域拆分

**步骤**:
1. [ ] 创建 `src/shared/types/kernel.ts` (基础设施类型)
2. [ ] 创建 `src/domains/identity/types.ts`
3. [ ] 创建 `src/domains/asset/types.ts`
4. [ ] 创建 `src/domains/task/types.ts`
5. [ ] 更新所有导入

---

## Phase 4: 测试覆盖 (3-5 天)

### Day 11-12: 单元测试

**目标**: 为核心模块添加测试

**测试清单**:
- [ ] DI 容器测试
- [ ] 事件总线测试
- [ ] 身份领域服务测试
- [ ] Hooks 测试 (使用 React Testing Library)

**示例**:
```typescript
// src/hooks/use-identity.test.ts
import { renderHook } from '@testing-library/react';
import { RuntimeContext } from '@/core/runtime';
import { useIdentities } from './use-identity';

test('should load identities', async () => {
  const mockRuntime = createMockRuntime();
  const { result } = renderHook(() => useIdentities(), {
    wrapper: ({ children }) => (
      <RuntimeContext.Provider value={mockRuntime}>
        {children}
      </RuntimeContext.Provider>
    ),
  });
  
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => {
    expect(result.current.identities).toHaveLength(2);
  });
});
```

### Day 13: Storybook

**目标**: 为 UI 组件添加 Storybook

**步骤**:
1. [ ] 安装 Storybook
   ```bash
   npx storybook@latest init
   ```

2. [ ] 创建组件 stories
   - [ ] Button
   - [ ] Card
   - [ ] Layout
   - [ ] Sidebar

3. [ ] 添加 Mock Runtime decorator

### Day 14-15: E2E 测试

**目标**: 使用 Playwright 添加 E2E 测试

**测试场景**:
- [ ] 用户登录流程
- [ ] 身份管理 CRUD
- [ ] 任务发布流程

---

## 📁 新增文件清单

```
src/
├── core/
│   └── runtime-refactored.ts      # 重构后的 Runtime (Phase 1)
├── hooks/
│   ├── use-identity.ts            # Identity hooks (Phase 2)
│   ├── use-api.ts                 # API hooks (Phase 3)
│   └── use-api-error.ts           # 错误处理 hook (Phase 3)
├── lib/
│   └── swr-config.ts              # SWR 配置 (Phase 3)
├── domains/
│   └── identity/
│       ├── types.ts               # 领域类型 (Phase 3)
│       └── services/
│           ├── identity-repository.ts      (Phase 2)
│           ├── identity-search-service.ts  (Phase 2)
│           ├── presence-manager.ts         (Phase 2)
│           └── identity-registry-facade.ts (Phase 2)
└── __tests__/
    ├── unit/                      # 单元测试 (Phase 4)
    └── e2e/                       # E2E 测试 (Phase 4)
```

---

## ⚠️ 风险提示

1. **破坏性变更**: 重构 Runtime 是破坏性变更，需要一次性完成
2. **回归风险**: 大量文件修改，需要充分测试
3. **时间估算**: 如果团队不熟悉 DDD，可能需要额外时间

---

## ✅ 验收标准

- [ ] 所有 Page 组件不直接调用 `getRuntime()`
- [ ] `core/runtime.ts` 不导入任何 Domain 代码
- [ ] 所有组件可通过 props/mock 测试
- [ ] 单元测试覆盖率 > 60%
- [ ] 构建成功，无类型错误
- [ ] 功能回归测试通过

---

## 🚀 快速开始

```bash
# 1. 创建功能分支
git checkout -b refactor/architecture-cleanup

# 2. 开始 Phase 1
cp src/core/runtime-refactored.ts src/core/runtime.ts

# 3. 验证构建
npm run build

# 4. 提交
git add .
git commit -m "refactor: decouple core from domain layers"
```

---

## 📚 参考文档

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [React 组合模式](https://react.dev/reference/react/Component)
- [SWR 文档](https://swr.vercel.app/)
- [Testing Library](https://testing-library.com/)
