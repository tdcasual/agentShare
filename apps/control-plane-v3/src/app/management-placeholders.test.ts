import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

async function readRouteSource(routePath: string) {
  const absolutePath = path.join(appDir, routePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('management placeholders', () => {
  it('identities page is backend-backed and keeps the demo route explicit', async () => {
    const source = await readRouteSource('identities/page.tsx');

    expect(source).toMatch(/useAdminAccounts/);
    expect(source).toMatch(/useAgents/);
    expect(source).toMatch(/persisted management accounts and registered agents from the backend/);
    expect(source).not.toMatch(/managed through the runtime system/);
    expect(source).toMatch(/\/demo\/identities/);
  });

  it('spaces page declares backend unavailability explicitly', async () => {
    const source = await readRouteSource('spaces/page.tsx');

    expect(source).toMatch(/not yet backed by a production API/);
    expect(source).toMatch(/\/demo\/spaces/);
  });
});
