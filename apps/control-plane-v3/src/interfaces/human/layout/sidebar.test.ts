import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sidebarDir = path.dirname(fileURLToPath(import.meta.url));

async function readSidebarSource() {
  const absolutePath = path.join(sidebarDir, 'sidebar.tsx');
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('sidebar navigation data', () => {
  it('does not ship a hardcoded tasks badge count', async () => {
    const source = await readSidebarSource();

    expect(source).not.toContain('badge: 3');
  });
});
