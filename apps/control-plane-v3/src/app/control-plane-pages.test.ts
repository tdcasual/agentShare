import { describe, it, expect } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

async function readRouteSource(routePath: string) {
  const absolutePath = path.join(appDir, routePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('Control Plane Pages', () => {
  it('tokens page wires the managed token lifecycle', async () => {
    const source = await readRouteSource('tokens/page.tsx');

    // 使用 SWR hooks 替代直接 API 调用
    expect(source).toMatch(/useAgents/);
    expect(source).toMatch(/useAgentsWithTokens/);
    expect(source).toMatch(/useCreateAgentToken/);
    expect(source).toMatch(/useRevokeAgentToken/);
  });

  it('tasks page publishes to tokens and records feedback per target', async () => {
    const source = await readRouteSource('tasks/page.tsx');

    expect(source).toMatch(/target_token_ids/);
    expect(source).toMatch(/buildTaskTargets/);
    expect(source).toMatch(/useCreateTaskTargetFeedback/);
  });

  it('settings page uses invite-only admin account management', async () => {
    const source = await readRouteSource('settings/page.tsx');

    // 检查是否使用管理相关的 hooks
    expect(source).toMatch(/useManagementSessionGate|useAdminAccounts/);
    expect(source).toMatch(/createAdminAccount|disableAdminAccount/);
  });

  it('identities page uses backend management data instead of demo-only placeholders', async () => {
    const source = await readRouteSource('identities/page.tsx');

    expect(source).toMatch(/useAdminAccounts/);
    expect(source).toMatch(/useAgentsWithTokens/);
    expect(source).toMatch(/useManagementPageSessionRecovery|useManagementSessionGate/);
    expect(source).not.toMatch(/managed through the runtime system/);
    expect(source).toMatch(/Management coverage/);
  });

  it('global search is wired to backend grouped search instead of mock suggestions', async () => {
    const source = await readRouteSource('../components/global-search.tsx');

    expect(source).toMatch(/useGlobalSearch/);
    expect(source).toMatch(/Assets/);
    expect(source).toMatch(/Skills/);
    expect(source).not.toMatch(/mockResults/);
  });

  it('hub activity feed is backed by live events instead of hardcoded samples', async () => {
    const source = await readRouteSource('page.tsx');

    expect(source).toMatch(/useEvents/);
    expect(source).toMatch(/useAdminAccounts/);
    expect(source).toMatch(/useAgentsWithTokens/);
    expect(source).toMatch(/useReviews/);
    expect(source).toMatch(/\/inbox/);
    expect(source).not.toMatch(/IdentityRegistryServiceId/);
    expect(source).not.toMatch(/spaces: 12/);
    expect(source).not.toMatch(/API Deployment/);
    expect(source).not.toMatch(/queued playbook/);
  });
});
