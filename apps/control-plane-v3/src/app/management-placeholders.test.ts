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
  it('identities page is backend-backed and replaces the demo placeholder with live coverage', async () => {
    const source = await readRouteSource('identities/page.tsx');

    expect(source).toMatch(/useAdminAccounts/);
    expect(source).toMatch(/useAgentsWithTokens/);
    expect(source).toMatch(
      /persisted management accounts and registered agents from the\s+backend/
    );
    expect(source).not.toMatch(/managed through the runtime system/);
    expect(source).toMatch(/Management coverage/);
    expect(source).not.toMatch(/\/demo\/identities/);
  });

  it('spaces page is backed by real management data instead of an unavailable placeholder', async () => {
    const source = await readRouteSource('spaces/page.tsx');

    expect(source).toMatch(/useEvents/);
    expect(source).toMatch(/useReviews/);
    expect(source).toMatch(/useAgentsWithTokens/);
    expect(source).toMatch(/Operations Space/);
    expect(source).not.toMatch(/not yet backed by a production API/);
  });

  it('marketplace page is backed by review and catalog data instead of a coming-soon placeholder', async () => {
    const source = await readRouteSource('marketplace/page.tsx');

    expect(source).toMatch(/useReviews/);
    expect(source).toMatch(/useCatalog/);
    expect(source).toMatch(/Only agents publish here/);
    expect(source).not.toMatch(/Marketplace Coming Soon/);
  });
});
