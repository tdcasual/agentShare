import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readRouteSource(routePath: string) {
  const absolutePath = path.join(appDir, routePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('Inbox page', () => {
  it('relies on the event hooks and layout shell', async () => {
    const source = await readRouteSource('inbox/page.tsx');

    expect(source).toMatch(/useEvents/);
    expect(source).toMatch(/useMarkEventRead/);
    expect(source).toMatch(/Layout/);
  });
});
