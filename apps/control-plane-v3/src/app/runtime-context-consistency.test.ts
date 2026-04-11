import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(appDir, '..');

async function readSource(relativePath: string) {
  return readFile(path.join(srcDir, relativePath), 'utf8');
}

describe('Runtime Context Consistency', () => {
  it('runtime provider and identity hooks share the same runtime module', async () => {
    const providerSource = await readSource('components/runtime-provider.tsx');
    const hookSource = await readSource('hooks/use-identity.ts');

    expect(providerSource).toMatch(/from ['"]@\/core\/runtime['"]/);
    expect(hookSource).toMatch(/from ['"]@\/core\/runtime['"]/);
  });

  it('app pages do not bypass the runtime provider with the global singleton', async () => {
    const hubPageSource = await readSource('app/page.tsx');
    const identitiesPageSource = await readSource('app/identities/page.tsx');

    expect(hubPageSource).not.toMatch(/getRuntime\(/);
    expect(identitiesPageSource).not.toMatch(/getRuntime\(|initializeRuntime\(/);
  });
});
