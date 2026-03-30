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

test('runtime provider and identity hooks share the same runtime module', async () => {
  const providerSource = await readSource('components/runtime-provider.tsx');
  const hookSource = await readSource('hooks/use-identity.ts');

  assert.match(providerSource, /from ['"]@\/core\/runtime['"]/);
  assert.match(
    hookSource,
    /from ['"]@\/core\/runtime['"]/,
    'identity hooks must consume the same runtime context module as RuntimeProvider',
  );
  assert.doesNotMatch(
    hookSource,
    /from ['"]@\/core\/runtime-refactored['"]/,
    'identity hooks must not import a second runtime context instance',
  );
});

test('app pages do not bypass the runtime provider with the global singleton', async () => {
  const hubPageSource = await readSource('app/page.tsx');
  const identitiesPageSource = await readSource('app/identities/page.tsx');

  assert.doesNotMatch(
    hubPageSource,
    /getRuntime\(/,
    'hub page should consume runtime data from the provider-backed context',
  );
  assert.doesNotMatch(
    identitiesPageSource,
    /getRuntime\(|initializeRuntime\(/,
    'identities page should consume runtime data from the provider-backed context',
  );
});
