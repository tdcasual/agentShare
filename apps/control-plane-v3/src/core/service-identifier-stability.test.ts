import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe('Service Identifier Stability', () => {
  it('service identifiers use a stable symbol registry key', async () => {
    const source = await readFile(path.join(testDir, 'plugin/types.ts'), 'utf8');

    expect(source).toMatch(/symbol:\s*Symbol\.for\(name\)/);
    expect(source).not.toMatch(/symbol:\s*Symbol\(name\)/);
  });
});
