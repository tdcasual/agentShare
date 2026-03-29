import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

async function readRouteSource(routePath: string) {
  const absolutePath = path.join(appDir, routePath);

  try {
    await access(absolutePath);
  } catch {
    assert.fail(`Expected route file to exist: ${routePath}`);
  }

  return readFile(absolutePath, 'utf8');
}

test('tokens page wires the managed token lifecycle', async () => {
  const source = await readRouteSource('tokens/page.tsx');

  assert.match(source, /api\.getAgents\(\)/);
  assert.match(source, /api\.getAgentTokens\(/);
  assert.match(source, /api\.createAgentToken\(/);
  assert.match(source, /api\.revokeAgentToken\(/);
});

test('tasks page publishes to tokens and records feedback per target', async () => {
  const source = await readRouteSource('tasks/page.tsx');

  assert.match(source, /target_token_ids/);
  assert.match(source, /buildTaskTargets/);
  assert.match(source, /api\.createTaskTargetFeedback\(/);
});

test('settings page uses invite-only admin account management', async () => {
  const source = await readRouteSource('settings/page.tsx');

  assert.match(source, /api\.getAdminAccounts\(\)/);
  assert.match(source, /api\.createAdminAccount\(/);
  assert.match(source, /api\.disableAdminAccount\(/);
  assert.match(source, /api\.logout\(\)/);
});
