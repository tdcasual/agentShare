import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getCreateActionTargets } from '@/components/create-menu';
import { getUserMenuTargets } from '@/interfaces/human/layout/header';
import { getRoutePolicy, isRouteAllowed } from '@/lib/route-policy';

const appDir = path.dirname(fileURLToPath(import.meta.url));

describe('shell route integrity', () => {
  it('does not point create-menu actions to missing routes', () => {
    expect(getCreateActionTargets()).toEqual([
      '/tokens',
      '/settings',
      '/tokens',
      '/spaces',
      '/settings',
    ]);
  });

  it('retargets user menu actions to existing routes', () => {
    expect(getUserMenuTargets()).toEqual(['/settings', '/settings', '/logout']);
  });

  it('allows logout as a functional auth transition route', () => {
    expect(getRoutePolicy('/logout')).toBeDefined();
    expect(isRouteAllowed('/logout', 'authenticated')).toEqual({ allowed: true });
  });

  it('ships an inbox page guarded by authenticated policy', async () => {
    expect(getRoutePolicy('/inbox')).toBeDefined();
    expect(isRouteAllowed('/inbox', 'authenticated')).toEqual({ allowed: true });
    await expect(access(path.join(appDir, 'inbox/page.tsx'))).resolves.toBeUndefined();
  });

  it('ships a readable demo hub page', async () => {
    expect(getRoutePolicy('/demo')).toBeDefined();
    expect(isRouteAllowed('/demo', 'anonymous')).toEqual({ allowed: true });
    await expect(access(path.join(appDir, 'demo/page.tsx'))).resolves.toBeUndefined();
  });

  it('ships a real logout page', async () => {
    await expect(access(path.join(appDir, 'logout/page.tsx'))).resolves.toBeUndefined();
  });

  it('ships an approvals page guarded by authenticated policy', async () => {
    expect(getRoutePolicy('/approvals')).toBeDefined();
    expect(isRouteAllowed('/approvals', 'authenticated')).toEqual({ allowed: true });
    await expect(access(path.join(appDir, 'approvals/page.tsx'))).resolves.toBeUndefined();
  });

  it('ships a playbooks page guarded by authenticated policy', async () => {
    expect(getRoutePolicy('/playbooks')).toBeDefined();
    expect(isRouteAllowed('/playbooks', 'authenticated')).toEqual({ allowed: true });
    await expect(access(path.join(appDir, 'playbooks/page.tsx'))).resolves.toBeUndefined();
  });

  it('ships a runs page guarded by authenticated policy', async () => {
    expect(getRoutePolicy('/runs')).toBeDefined();
    expect(isRouteAllowed('/runs', 'authenticated')).toEqual({ allowed: true });
    await expect(access(path.join(appDir, 'runs/page.tsx'))).resolves.toBeUndefined();
  });
});
