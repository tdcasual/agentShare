import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));

test('service identifiers use a stable symbol registry key', async () => {
  const source = await readFile(path.join(testDir, 'plugin/types.ts'), 'utf8');

  assert.match(
    source,
    /symbol:\s*Symbol\.for\(name\)/,
    'service identifiers must remain stable across module reloads and duplicate bundles',
  );
  assert.doesNotMatch(
    source,
    /symbol:\s*Symbol\(name\)/,
    'unique symbols break DI lookups when the same module is evaluated more than once',
  );
});
