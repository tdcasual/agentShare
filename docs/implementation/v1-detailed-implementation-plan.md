# V1 详细实施计划

## 概述
基于审计文档 `2026-04-03-frontend-backend-alignment-audit.md`，制定前端完善方案。

---

## 阶段1: P0 核心权限架构修复

### 1.1 角色系统基础

**新建**: `apps/control-plane-v3/src/lib/role-system.ts`
```typescript
export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';

export const ROLE_LEVELS: Record<ManagementRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  owner: 4,
};

export function hasRequiredRole(userRole: ManagementRole, requiredRole: ManagementRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}
```

### 1.2 扩展路由策略

**修改**: `apps/control-plane-v3/src/lib/route-policy.ts`
- 添加 `requiredRole` 字段
- 更新所有路由配置

### 1.3 403页面

**新建**: `apps/control-plane-v3/src/app/forbidden/page.tsx`
- 使用Kawaii风格
- 显示当前角色和所需角色

### 1.4 移除asset domain

**删除**: `apps/control-plane-v3/src/domains/asset/`

---

## 阶段2: P1 数据契约对齐

### 2.1 Session类型修复

**修改**: `apps/control-plane-v3/src/shared/types/index.ts`

### 2.2 Run DTO分离

**修改**: `apps/control-plane-v3/src/domains/task/types.ts`
- 添加 TransportDTO
- 添加转换函数

### 2.3 Task-Target统一

**修改**: `apps/control-plane-v3/src/domains/task/hooks-dashboard.ts`

---

## 阶段3: P2 缺失功能

### 3.1 Approvals页面

文件列表：
- `app/approvals/page.tsx`
- `domains/approval/api.ts`
- `domains/approval/hooks.ts`
- `domains/approval/types.ts`

### 3.2 Playbooks页面

文件列表：
- `app/playbooks/page.tsx`
- `domains/playbook/api.ts`
- `domains/playbook/hooks.ts`
- `domains/playbook/types.ts`

### 3.3 Runs页面

文件列表：
- `app/runs/page.tsx`
- `domains/run/api.ts`
- `domains/run/hooks.ts`
- `domains/run/types.ts`

### 3.4 Spaces增强

文件列表：
- `domains/space/components/space-create-modal.tsx`
- `domains/space/components/space-member-manager.tsx`

---

## 验证

- 契约测试
- 权限测试
- UI回归测试
