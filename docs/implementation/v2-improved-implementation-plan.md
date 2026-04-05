# V2 完善实施计划

基于第1次审计结果改进。

---

## 阶段0: 前置准备

### 0.1 引用检查（删除asset domain前）

```bash
cd apps/control-plane-v3
grep -r "from '@/domains/asset'" src/ || echo "✅ No references found"
grep -r "from '@/domains/asset'" src/ 2>/dev/null | wc -l
```

**前置条件**: 确认0引用后才可删除

### 0.2 角色来源分析

检查后端session响应结构：
```typescript
// GET /api/session/me 返回结构
interface SessionResponse {
  actor_id: string;
  actor_type: 'human';
  role: ManagementRole;  // 角色来源
  email: string;
  session_id: string;
  issued_at: number;
  expires_at: number;
}
```

---

## 阶段1: P0 核心权限架构

### 1.1 角色系统（含状态管理）

**新建**: `apps/control-plane-v3/src/lib/role-system.ts`

```typescript
export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';

export const ROLE_LEVELS: Record<ManagementRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

export function hasRequiredRole(
  userRole: ManagementRole, 
  requiredRole: ManagementRole
): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

// 最小角色计算
export function getMinimumRole(roles: ManagementRole[]): ManagementRole {
  return roles.reduce((min, role) => 
    ROLE_LEVELS[role] < ROLE_LEVELS[min] ? role : min
  );
}
```

**修改**: `apps/control-plane-v3/src/lib/session-state.ts`

添加角色到会话状态：
```typescript
export interface SessionStateData {
  role: ManagementRole;
  email: string;
  // ...其他字段
}

export function getEffectiveRole(): ManagementRole {
  // 从session或localStorage获取
}
```

**新建**: `apps/control-plane-v3/src/hooks/use-role.ts`

```typescript
export function useRole() {
  const { session } = useManagementSession();
  
  return {
    role: session?.role ?? null,
    isViewer: session?.role === 'viewer',
    isOperator: ['operator', 'admin', 'owner'].includes(session?.role),
    isAdmin: ['admin', 'owner'].includes(session?.role),
    isOwner: session?.role === 'owner',
    hasRole: (required: ManagementRole) => 
      session?.role ? hasRequiredRole(session.role, required) : false,
  };
}
```

### 1.2 扩展路由策略

**修改**: `apps/control-plane-v3/src/lib/route-policy.ts`

```typescript
export interface RoutePolicy {
  path: string;
  mode: RouteMode;
  requiredRole: ManagementRole | null;  // 新增
  requiredSession: SessionState | null;
  dataSource: DataSource;
  unauthorizedBehavior: 'redirect' | 'block' | 'allow_readonly' | 'show_forbidden';
  redirectTo?: string;
}

// 路由配置（按审计要求）
export const ROUTE_POLICIES: RoutePolicy[] = [
  // viewer级别
  { path: '/', requiredRole: 'viewer', ... },
  { path: '/inbox', requiredRole: 'viewer', ... },
  
  // operator级别
  { path: '/tasks', requiredRole: 'operator', ... },
  { path: '/reviews', requiredRole: 'operator', ... },
  { path: '/approvals', requiredRole: 'operator', ... },
  { path: '/marketplace', requiredRole: 'operator', ... },
  
  // admin级别
  { path: '/identities', requiredRole: 'admin', ... },
  { path: '/tokens', requiredRole: 'admin', ... },
  { path: '/assets', requiredRole: 'admin', ... },
  { path: '/settings', requiredRole: 'admin', ... },
  { path: '/spaces', requiredRole: 'admin', ... },
  
  // owner级别（特殊操作）
  // delete agent 操作在identities页面内控制
];
```

### 1.3 403页面（客户端策略）

**决定**: 使用客户端路由守卫显示403状态，而非独立页面

**修改**: `apps/control-plane-v3/src/components/route-guard.tsx`

添加403状态渲染：
```typescript
interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // 403时显示
}

// 403状态组件
function ForbiddenState({ requiredRole }: { requiredRole: ManagementRole }) {
  const { role } = useRole();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/50 to-purple-50/30">
      <Card variant="kawaii" className="max-w-md w-full mx-4 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center animate-pulse">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          访问受限
        </h1>
        <p className="text-gray-600 mb-4">
          您的角色 <Badge>{role}</Badge> 无法访问此页面
        </p>
        <p className="text-sm text-gray-500 mb-6">
          需要角色: <Badge variant="primary">{requiredRole}</Badge>
        </p>
        <Button variant="kawaii" onClick={() => router.push('/')}>
          返回首页
        </Button>
      </Card>
    </div>
  );
}
```

### 1.4 渐进式移除asset domain

**步骤1**: 标记废弃（Week 1）
```typescript
// 在 asset/index.ts 添加
/** @deprecated 后端已移除 /api/assets，请使用 governance domain */
export const assetApi = { ... };
```

**步骤2**: 检查并替换引用（Week 2）
```bash
grep -rn "assetApi\|from '@/domains/asset'" src/
```

**步骤3**: 删除目录（Week 3，确认无引用后）
```bash
rm -rf src/domains/asset
```

---

## 阶段2: P1 数据契约对齐

### 2.1 DTO转换架构

**新建**: `apps/control-plane-v3/src/lib/dto-transformer.ts`

统一转换层：
```typescript
// 命名规范
// TransportDTO: 后端原始结构（snake_case）
// DomainModel: 前端使用结构（camelCase）

export interface DTOTransformer<TDTO, TModel> {
  toModel(dto: TDTO): TModel;
  toDTO(model: TModel): TDTO;
}

// 通用转换函数
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function transformKeys<T>(obj: Record<string, unknown>, transform: (k: string) => string): T {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[transform(key)] = value;
    return acc;
  }, {} as T);
}
```

### 2.2 Session类型修复

**修改**: `apps/control-plane-v3/src/shared/types/index.ts`

```typescript
// Transport DTO（后端实际返回）
export interface ManagementSessionTransportDTO {
  actor_id: string;
  actor_type: 'human';
  session_id: string;
  email: string;
  role: ManagementRole;
  issued_at: number;
  expires_at: number;
}

// Domain Model（前端使用）
export interface ManagementSession {
  actorId: string;
  actorType: 'human';
  sessionId: string;
  email: string;
  role: ManagementRole;
  issuedAt: Date;
  expiresAt: Date;
}

// 转换函数
export function toSessionModel(dto: ManagementSessionTransportDTO): ManagementSession {
  return {
    actorId: dto.actor_id,
    actorType: dto.actor_type,
    sessionId: dto.session_id,
    email: dto.email,
    role: dto.role,
    issuedAt: new Date(dto.issued_at * 1000),
    expiresAt: new Date(dto.expires_at * 1000),
  };
}
```

### 2.3 Run DTO修复

**修改**: `apps/control-plane-v3/src/domains/task/types.ts`

```typescript
// Transport DTO
export interface RunTransportDTO {
  run_id: string;
  task_id: string;
  agent_id?: string;
  token_id?: string;
  task_target_id?: string;
  result_summary?: string;
  output_payload?: unknown;
  error_summary?: string;
  capability_invocations: unknown[];
  lease_events: unknown[];
  created_at: number;
  updated_at: number;
}

// Domain Model
export interface Run {
  runId: string;
  taskId: string;
  agentId?: string;
  tokenId?: string;
  taskTargetId?: string;
  resultSummary?: string;
  outputPayload?: unknown;
  errorSummary?: string;
  capabilityInvocations: unknown[];
  leaseEvents: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

// 转换器
export const RunTransformer: DTOTransformer<RunTransportDTO, Run> = {
  toModel(dto) {
    return {
      runId: dto.run_id,
      taskId: dto.task_id,
      agentId: dto.agent_id,
      tokenId: dto.token_id,
      taskTargetId: dto.task_target_id,
      resultSummary: dto.result_summary,
      outputPayload: dto.output_payload,
      errorSummary: dto.error_summary,
      capabilityInvocations: dto.capability_invocations ?? [],
      leaseEvents: dto.lease_events ?? [],
      createdAt: new Date(dto.created_at * 1000),
      updatedAt: new Date(dto.updated_at * 1000),
    };
  },
  toDTO(model) {
    return {
      run_id: model.runId,
      task_id: model.taskId,
      agent_id: model.agentId,
      token_id: model.tokenId,
      task_target_id: model.taskTargetId,
      result_summary: model.resultSummary,
      output_payload: model.outputPayload,
      error_summary: model.errorSummary,
      capability_invocations: model.capabilityInvocations,
      lease_events: model.leaseEvents,
      created_at: Math.floor(model.createdAt.getTime() / 1000),
      updated_at: Math.floor(model.updatedAt.getTime() / 1000),
    };
  },
};
```

### 2.4 Task-Target统一

**修改**: `apps/control-plane-v3/src/domains/task/hooks-dashboard.ts`

```typescript
// 统一的数据结构
export interface TaskTargetView {
  targetId: string;        // 来自 task.target_ids[i]
  tokenId?: string;        // 来自 task.target_token_ids[i]
  status: TaskTargetStatus;
  claimedAt?: Date;
  completedAt?: Date;
  assignedAgent?: AgentSummary;
}

// 统一构建函数
export function buildTaskTargets(
  task: TaskTransportDTO,
  agents: AgentSummary[]
): TaskTargetView[] {
  return task.target_ids.map((targetId, index) => {
    const tokenId = task.target_token_ids?.[index];
    const agent = tokenId ? agents.find(a => a.tokenId === tokenId) : undefined;
    
    return {
      targetId,
      tokenId,
      status: task.target_statuses?.[index] ?? 'pending',
      claimedAt: task.target_claimed_at?.[index] 
        ? new Date(task.target_claimed_at[index] * 1000) 
        : undefined,
      completedAt: task.target_completed_at?.[index]
        ? new Date(task.target_completed_at[index] * 1000)
        : undefined,
      assignedAgent: agent,
    };
  });
}
```

---

## 阶段3: P2 缺失功能

### 3.1 统一Domain结构

每个新domain遵循标准结构：
```
domains/{name}/
├── api.ts           # API调用（返回TransportDTO）
├── hooks.ts         # React Query hooks
├── types.ts         # TransportDTO + DomainModel + Transformer
├── index.ts         # 公开导出
└── components/      # 领域组件
    ├── {name}-card.tsx
    ├── {name}-list.tsx
    ├── {name}-detail.tsx
    └── {name}-form.tsx
```

### 3.2 Approvals领域

**文件**: `domains/approval/types.ts`
```typescript
export interface ApprovalTransportDTO {
  approval_id: string;
  request_type: string;
  requester_id: string;
  requester_type: 'agent' | 'human';
  resource_type: string;
  resource_id: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
  reviewed_by?: string;
  reviewed_at?: number;
}

export interface Approval {
  approvalId: string;
  requestType: string;
  requesterId: string;
  requesterType: 'agent' | 'human';
  resourceType: string;
  resourceId: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}
```

**文件**: `domains/approval/components/approval-card.tsx`
```typescript
// Kawaii风格卡片
// 状态徽章：pending(黄色) approved(薄荷绿) rejected(粉红)
// 操作按钮：批准(gradient) 拒绝(outline)
```

### 3.3 Playbooks领域

**文件**: `domains/playbook/types.ts`
```typescript
export interface Playbook {
  playbookId: string;
  title: string;
  body: string;
  taskType: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaybookSearchFilters {
  taskType?: string;
  q?: string;
  tag?: string;
}
```

### 3.4 Runs领域

**文件**: `domains/run/components/run-timeline.tsx`
```typescript
// 时间线组件
// 节点颜色：success(薄荷绿) error(粉红) pending(黄色)
// 动画：进行中节点pulse效果
```

### 3.5 Spaces增强

**文件**: `domains/space/components/space-create-modal.tsx`
```typescript
// 模态框：rounded-3xl, 毛玻璃效果
// 表单：圆角输入框，粉色聚焦边框
```

**文件**: `domains/space/components/space-member-manager.tsx`
```typescript
// 成员列表：头像+名称+角色下拉框
// 角色选项：viewer/operator/admin/owner
```

---

## 阶段4: 测试与验证

### 4.1 契约测试

```bash
npm run sync:contracts
npm run test:contracts
```

### 4.2 权限测试矩阵

| 角色 | 测试路径 | 期望结果 |
|------|----------|----------|
| viewer | /identities | 显示403页面 |
| operator | /approvals | 正常访问 |
| admin | /settings | 正常访问 |
| owner | delete agent | 正常访问 |

### 4.3 Mock方案

**开发时使用MSW (Mock Service Worker)**:
```typescript
// mocks/handlers.ts
export const handlers = [
  rest.get('/api/session/me', (req, res, ctx) => {
    return res(ctx.json({ role: 'operator', ... }));
  }),
  rest.get('/api/approvals', (req, res, ctx) => {
    return res(ctx.json({ items: mockApprovals }));
  }),
];
```

---

## 风险缓解

| 风险 | 缓解措施 |
|------|----------|
| 删除asset domain导致构建失败 | 先标记废弃，验证0引用后再删除 |
| 角色变更影响现有用户 | 向后兼容：默认admin角色 |
| DTO变更导致类型错误 | 分阶段：添加新类型→迁移→删除旧类型 |
| 新页面开发时间长 | 复用现有UI原语组件 |
