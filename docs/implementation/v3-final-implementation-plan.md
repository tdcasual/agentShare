# V3 最终完善实施计划

**版本**: 3.0  
**基于审计**: 第1次审计 + 第2次审计  
**目标**: 生产就绪的前后端对齐方案

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Middleware  │  │   Routes    │  │   Error Boundary    │  │
│  │ (服务端403)  │  │ (权限守卫)   │  │   (友好错误页面)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  RouteGuard │  │   useRole   │  │    Zustand Store    │  │
│  │ (客户端守卫) │  │ (角色检查)  │  │   (全局状态管理)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    API      │  │ Transformer │  │    SWR Cache        │  │
│  │  (原始DTO)   │  │ (延迟转换)  │  │   (安全策略)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 阶段0: 前置验证

### 0.1 后端API确认清单

在开发前端前，必须确认后端存在以下路由：

```typescript
// 必须存在的API（先核对后端routes/__init__.py）
const REQUIRED_APIS = [
  // 现有（已确认存在）
  'GET  /api/session/me',
  'POST /api/session/logout',
  'GET  /api/agents',
  'GET  /api/agent-tokens',
  'GET  /api/tasks',
  'GET  /api/reviews',
  'GET  /api/spaces',
  
  // 需要确认（P2功能）
  'GET    /api/approvals',              // ❓ 确认存在
  'POST   /api/approvals/:id/approve',  // ❓ 确认存在
  'POST   /api/approvals/:id/reject',   // ❓ 确认存在
  'GET    /api/playbooks',              // ❓ 确认存在
  'GET    /api/playbooks/search',       // ❓ 确认存在
  'POST   /api/playbooks',              // ❓ 确认存在
  'GET    /api/runs',                   // ❓ 确认存在
  'POST   /api/spaces',                 // ❓ 确认存在
  'POST   /api/spaces/:id/members',     // ❓ 确认存在
];
```

**确认命令**:
```bash
grep -r "@router.get\|@router.post" apps/api/app/routes/ | grep -E "approvals|playbooks|runs"
```

### 0.2 Asset Domain迁移检查

```bash
cd apps/control-plane-v3

# 1. 检查引用
echo "=== JS/TS Imports ==="
grep -rn "from '@/domains/asset'" src/ || echo "No ES6 imports found"

echo "=== Require statements ==="
grep -rn "require.*domains/asset" src/ || echo "No require found"

echo "=== Type references ==="
grep -rn "Asset\|AssetType\|AssetStatus" src/ | grep -v "node_modules" | head -20

# 2. 确认assets页面使用governance
grep -n "governance" src/app/assets/page.tsx
```

**迁移决策矩阵**:
| 检查结果 | 行动 |
|---------|------|
| 0引用 | 直接删除 |
| 有引用但在assets页面 | 替换为governance |
| 有其他页面引用 | 暂停，人工检查 |

---

## 阶段1: P0 核心权限架构

### 1.1 Next.js Middleware（服务端拦截）

**新建**: `apps/control-plane-v3/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROLE_LEVELS, type ManagementRole } from './lib/role-system';

// 路由角色映射（与客户端共享配置）
const ROUTE_ROLES: Record<string, ManagementRole> = {
  '/': 'viewer',
  '/inbox': 'viewer',
  '/tasks': 'operator',
  '/reviews': 'operator',
  '/approvals': 'operator',
  '/marketplace': 'operator',
  '/identities': 'admin',
  '/tokens': 'admin',
  '/assets': 'admin',
  '/settings': 'admin',
  '/spaces': 'admin',
  '/playbooks': 'operator',
  '/runs': 'operator',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 获取session cookie
  const session = request.cookies.get('management_session')?.value;
  
  // 公开路由放行
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/setup') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // 未登录重定向
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 检查角色权限
  const requiredRole = ROUTE_ROLES[pathname];
  if (requiredRole) {
    try {
      const payload = JSON.parse(atob(session.split('.')[1]));
      const userRole = payload.role as ManagementRole;
      
      if (ROLE_LEVELS[userRole] < ROLE_LEVELS[requiredRole]) {
        // 添加header标记403（客户端可读取）
        const response = NextResponse.next();
        response.headers.set('x-required-role', requiredRole);
        response.headers.set('x-current-role', userRole);
        return response;
      }
    } catch {
      // Token解析失败，重定向登录
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
```

### 1.2 全局状态管理（Zustand）

**新建**: `apps/control-plane-v3/src/store/role-store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ManagementRole } from '@/lib/role-system';

interface RoleState {
  role: ManagementRole | null;
  setRole: (role: ManagementRole) => void;
  clearRole: () => void;
  hasRole: (required: ManagementRole) => boolean;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      role: null,
      setRole: (role) => set({ role }),
      clearRole: () => set({ role: null }),
      hasRole: (required) => {
        const { role } = get();
        if (!role) return false;
        const levels = { viewer: 1, operator: 2, admin: 3, owner: 4 };
        return levels[role] >= levels[required];
      },
    }),
    {
      name: 'role-storage',
    }
  )
);
```

### 1.3 角色Hook（同步更新）

**修改**: `apps/control-plane-v3/src/hooks/use-role.ts`

```typescript
import { useEffect } from 'react';
import { useManagementSession } from '@/lib/session';
import { useRoleStore } from '@/store/role-store';
import type { ManagementRole } from '@/lib/role-system';

export function useRole() {
  const { session, loading } = useManagementSession();
  const { role, setRole, hasRole } = useRoleStore();
  
  // 同步session到store
  useEffect(() => {
    if (session?.role && session.role !== role) {
      setRole(session.role);
    }
  }, [session?.role, role, setRole]);
  
  return {
    role,
    isLoading: loading,
    isViewer: role === 'viewer',
    isOperator: ['operator', 'admin', 'owner'].includes(role ?? ''),
    isAdmin: ['admin', 'owner'].includes(role ?? ''),
    isOwner: role === 'owner',
    hasRole: (required: ManagementRole) => hasRole(required),
  };
}
```

### 1.4 统一403状态组件

**新建**: `apps/control-plane-v3/src/components/forbidden-state.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/use-role';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import type { ManagementRole } from '@/lib/role-system';

interface ForbiddenStateProps {
  requiredRole: ManagementRole;
  resourceName?: string;
}

export function ForbiddenState({ requiredRole, resourceName }: ForbiddenStateProps) {
  const router = useRouter();
  const { role } = useRole();
  
  const roleLabels: Record<ManagementRole, string> = {
    viewer: '观察者',
    operator: '操作员',
    admin: '管理员',
    owner: '所有者',
  };
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card 
        variant="kawaii" 
        decoration
        className="max-w-md w-full text-center animate-scale-in"
      >
        {/* 图标 */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
          <span className="text-5xl animate-pulse">🔒</span>
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          访问受限
        </h1>
        
        {/* 描述 */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {resourceName ? `您没有权限访问 ${resourceName}` : '您没有权限访问此页面'}
        </p>
        
        {/* 角色对比 */}
        <div className="flex items-center justify-center gap-4 mb-8 text-sm">
          <div className="px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
            当前: {role ? roleLabels[role] : '未登录'}
          </div>
          <span className="text-gray-400">→</span>
          <div className="px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
            需要: {roleLabels[requiredRole]}
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="kawaii" onClick={() => router.push('/')}>
            返回首页
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            返回上一页
          </Button>
        </div>
        
        {/* 帮助链接 */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          如需访问权限，请联系系统管理员
        </p>
      </Card>
    </div>
  );
}
```

### 1.5 增强版Route Guard

**修改**: `apps/control-plane-v3/src/components/route-guard.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/use-role';
import { getRoutePolicy } from '@/lib/route-policy';
import { ForbiddenState } from './forbidden-state';
import { CuteSpinner } from './kawaii/cute-spinner';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const { role, isLoading, hasRole } = useRole();
  const [showForbidden, setShowForbidden] = useState(false);
  
  useEffect(() => {
    if (isLoading || !role) return;
    
    const policy = getRoutePolicy(pathname);
    if (policy?.requiredRole && !hasRole(policy.requiredRole)) {
      setShowForbidden(true);
    } else {
      setShowForbidden(false);
    }
  }, [pathname, role, isLoading, hasRole]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CuteSpinner size="lg" />
      </div>
    );
  }
  
  if (showForbidden) {
    const policy = getRoutePolicy(pathname);
    return (
      <ForbiddenState 
        requiredRole={policy?.requiredRole ?? 'admin'}
        resourceName={pathname}
      />
    );
  }
  
  return <>{children}</>;
}
```

### 1.6 角色感知导航（含移动端）

**修改**: `apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx`

```typescript
import { useRole } from '@/hooks/use-role';
import type { ManagementRole } from '@/lib/role-system';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiredRole: ManagementRole;
  badge?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/', label: '首页', icon: <HomeIcon />, requiredRole: 'viewer' },
  { href: '/inbox', label: '收件箱', icon: <InboxIcon />, requiredRole: 'viewer' },
  { href: '/tasks', label: '任务', icon: <TaskIcon />, requiredRole: 'operator' },
  { href: '/reviews', label: '审核', icon: <ReviewIcon />, requiredRole: 'operator' },
  { href: '/approvals', label: '审批', icon: <ApprovalIcon />, requiredRole: 'operator' },
  { href: '/marketplace', label: '市场', icon: <MarketIcon />, requiredRole: 'operator' },
  { href: '/playbooks', label: '手册', icon: <BookIcon />, requiredRole: 'operator' },
  { href: '/runs', label: '运行', icon: <RunIcon />, requiredRole: 'operator' },
  { href: '/identities', label: '身份', icon: <UserIcon />, requiredRole: 'admin' },
  { href: '/tokens', label: '令牌', icon: <KeyIcon />, requiredRole: 'admin' },
  { href: '/assets', label: '资产', icon: <AssetIcon />, requiredRole: 'admin' },
  { href: '/spaces', label: '空间', icon: <SpaceIcon />, requiredRole: 'admin' },
  { href: '/settings', label: '设置', icon: <SettingsIcon />, requiredRole: 'admin' },
];

export function Sidebar() {
  const { hasRole } = useRole();
  
  // 过滤可见菜单
  const visibleItems = ALL_NAV_ITEMS.filter(item => 
    hasRole(item.requiredRole)
  );
  
  // 移动端：底部导航栏
  // 平板：侧边栏
  // 桌面：展开侧边栏
  return (
    <nav>
      {visibleItems.map(item => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
```

### 1.7 Asset Domain渐进式移除

**Week 1**: 标记废弃
```typescript
// domains/asset/index.ts
/**
 * @deprecated 
 * 后端 /api/assets 已移除，此domain将在v2.0删除。
 * 请迁移至 governance domain：
 * import { governanceApi } from '@/domains/governance';
 * 
 * 迁移指南：
 * - asset.list() → governance.listSecrets()
 * - asset.create() → governance.createCapability()
 */
export const assetApi = { ... };
```

**Week 2**: 自动检查脚本
```bash
#!/bin/bash
# scripts/check-asset-references.sh

cd apps/control-plane-v3

# 检查所有引用
REFERENCES=$(grep -rn "assetApi\|from '@/domains/asset'\|from '@/domains/asset/'" src/ 2>/dev/null || true)

if [ -z "$REFERENCES" ]; then
  echo "✅ No references to asset domain found. Safe to delete."
  exit 0
else
  echo "❌ Found references to asset domain:"
  echo "$REFERENCES"
  exit 1
fi
```

**Week 3**: 删除（确认无引用后）
```bash
rm -rf apps/control-plane-v3/src/domains/asset
```

---

## 阶段2: P1 数据契约对齐

### 2.1 延迟DTO转换架构

**新建**: `apps/control-plane-v3/src/lib/dto-transformer.ts`

```typescript
// 性能优化：延迟转换 + 缓存

interface TransformCache<TDTO, TModel> {
  get(dto: TDTO): TModel | undefined;
  set(dto: TDTO, model: TModel): void;
  clear(): void;
}

function createTransformCache<TDTO, TModel>(keyFn: (dto: TDTO) => string): TransformCache<TDTO, TModel> {
  const cache = new Map<string, TModel>();
  
  return {
    get: (dto) => cache.get(keyFn(dto)),
    set: (dto, model) => cache.set(keyFn(dto), model),
    clear: () => cache.clear(),
  };
}

// Run转换器（带缓存）
class RunTransformer {
  private cache = createTransformCache<RunTransportDTO, Run>(d => d.run_id);
  
  toModel(dto: RunTransportDTO): Run {
    // 检查缓存
    const cached = this.cache.get(dto);
    if (cached) return cached;
    
    // 转换
    const model: Run = {
      runId: dto.run_id,
      taskId: dto.task_id,
      // ...
      createdAt: new Date(dto.created_at * 1000),
    };
    
    // 缓存
    this.cache.set(dto, model);
    return model;
  }
  
  toModelList(dtos: RunTransportDTO[]): Run[] {
    return dtos.map(d => this.toModel(d));
  }
}

export const runTransformer = new RunTransformer();
```

### 2.2 API Hook（自动转换）

**模式示例**:
```typescript
// domains/run/hooks.ts
export function useRuns() {
  const { data, error, isLoading } = useSWR(
    '/api/runs',
    fetcher,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );
  
  // 延迟转换
  const runs = data ? runTransformer.toModelList(data.items) : undefined;
  
  return { runs, error, isLoading };
}
```

### 2.3 SWR安全缓存配置

**新建**: `apps/control-plane-v3/src/lib/swr-config.ts`

```typescript
import type { SWRConfiguration } from 'swr';

// 基于权限的缓存策略
export const createSWRConfig = (role: string): SWRConfiguration => ({
  // 权限数据不长期缓存
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  
  // 敏感数据短缓存
  dedupingInterval: role === 'viewer' ? 10000 : 5000,
  
  // 错误时快速重试
  errorRetryCount: 3,
  errorRetryInterval: (retryCount) => Math.min(1000 * 2 ** retryCount, 30000),
  
  // 权限变更时刷新
  refreshInterval: (latestData) => {
    // 检查是否有权限变更标记
    if (latestData?._meta?.permissionChanged) {
      return 0; // 立即刷新
    }
    return 0; // 默认不自动轮询
  },
});
```

---

## 阶段3: P2 缺失功能

### 3.1 统一加载组件

**新建**: `apps/control-plane-v3/src/components/kawaii/page-loader.tsx`

```typescript
interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function PageLoader({ 
  message = '加载中...', 
  fullScreen = false 
}: PageLoaderProps) {
  const baseClasses = "flex flex-col items-center justify-center gap-4";
  const sizeClasses = fullScreen 
    ? "min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30" 
    : "min-h-[40vh]";
  
  return (
    <div className={`${baseClasses} ${sizeClasses}`}>
      <CuteSpinner size="lg" />
      <p className="text-gray-500 dark:text-gray-400 animate-pulse">{message}</p>
    </div>
  );
}
```

### 3.2 Error Boundary

**新建**: `apps/control-plane-v3/src/components/error-boundary.tsx`

```typescript
'use client';

import { Component, type ReactNode } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card variant="kawaii" className="max-w-lg w-full text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-4xl">💥</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              页面出错了
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              {this.state.error?.message || '未知错误'}
            </p>
            <Button 
              variant="kawaii" 
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </Card>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 3.3 Approvals完整实现

**API**: `domains/approval/api.ts`
```typescript
const API_BASE = '/api/approvals';

export const approvalApi = {
  list: () => fetcher<ApprovalListResponse>(API_BASE),
  
  approve: (id: string, reason?: string) => 
    fetcher(`${API_BASE}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    
  reject: (id: string, reason?: string) =>
    fetcher(`${API_BASE}/${id}/reject`, {
      method: 'POST', 
      body: JSON.stringify({ reason }),
    }),
};
```

**页面**: `app/approvals/page.tsx`
```typescript
export default function ApprovalsPage() {
  const { approvals, isLoading } = useApprovals();
  const { mutate } = useSWRConfig();
  
  const handleApprove = async (id: string) => {
    await approvalApi.approve(id);
    mutate('/api/approvals');
  };
  
  if (isLoading) return <PageLoader message="加载审批列表..." />;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">待审批请求</h1>
      <div className="grid gap-4">
        {approvals?.map(approval => (
          <ApprovalCard 
            key={approval.approvalId}
            approval={approval}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3.4 国际化支持

**新增**: `apps/control-plane-v3/messages/zh.json`
```json
{
  "forbidden": {
    "title": "访问受限",
    "description": "您没有权限访问此页面",
    "currentRole": "当前角色",
    "requiredRole": "需要角色",
    "backHome": "返回首页",
    "back": "返回上一页"
  },
  "approvals": {
    "title": "待审批请求",
    "empty": "暂无待审批请求",
    "approve": "批准",
    "reject": "拒绝"
  }
}
```

---

## 阶段4: 验证

### 4.1 自动化检查清单

```bash
#!/bin/bash
# scripts/verify-implementation.sh

echo "=== 1. 类型检查 ==="
cd apps/control-plane-v3 && npm run typecheck

echo "=== 2. 契约测试 ==="
npm run test:contracts

echo "=== 3. 权限检查 ==="
# 检查所有路由都有requiredRole
grep -n "requiredRole" src/lib/route-policy.ts | wc -l

echo "=== 4. 国际化检查 ==="
# 检查所有文本都有t()包裹
grep -rn "硬编码中文" src/ || echo "✅ 无硬编码中文"

echo "=== 5. Asset Domain检查 ==="
./scripts/check-asset-references.sh
```

### 4.2 手动测试矩阵

| 角色 | 操作 | 期望 |
|------|------|------|
| viewer | 访问/identities | 看到403页面（可爱风格） |
| operator | 访问/approvals | 正常加载，可操作 |
| operator | 点击批准 | 状态更新，动画反馈 |
| admin | 访问所有页面 | 全部正常 |
| owner | 删除agent | 成功操作 |

---

## 时间线

| 周次 | 内容 |
|------|------|
| W1 | 前置验证 + Middleware + 角色系统基础 |
| W2 | Route Guard + 403页面 + Asset标记废弃 |
| W3 | DTO转换架构 + Session/Run/Feedback修复 |
| W4 | Asset删除 + Approvals页面 |
| W5 | Playbooks + Runs页面 |
| W6 | Spaces增强 + 导航更新 + 验证测试 |

---

## 成功标准

1. ✅ viewer访问admin页面 → 可爱403页面
2. ✅ `npm run typecheck` 无错误
3. ✅ `npm run test:contracts` 通过
4. ✅ Approvals/Playbooks/Runs功能完整
5. ✅ 移动端403页面正常显示
6. ✅ 所有新功能有国际化支持
