import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(appDir, '..');

async function readSource(relativePath: string) {
  return readFile(path.join(srcDir, relativePath), 'utf8');
}

test('identity composite hooks do not call hooks inside array loops', async () => {
  const source = await readSource('domains/identity/hooks.ts');

  assert.doesNotMatch(
    source,
    /map\(agentId\s*=>\s*[\s\S]*useAgentTokens\(/,
    'useAgentsWithTokens must aggregate token requests without calling hooks in a loop',
  );
});

test('task dashboard hooks do not call hooks inside array loops', async () => {
  const source = await readSource('domains/task/hooks-dashboard.ts');

  assert.doesNotMatch(
    source,
    /map\(agentId\s*=>\s*[\s\S]*useSWR(?:<[\s\S]*?>)?\(/,
    'useTaskDashboard must not create token queries by calling hooks in a loop',
  );
  assert.doesNotMatch(
    source,
    /map\(tokenId\s*=>\s*[\s\S]*useSWR(?:<[\s\S]*?>)?\(/,
    'useTaskDashboard must not create feedback queries by calling hooks in a loop',
  );
});
