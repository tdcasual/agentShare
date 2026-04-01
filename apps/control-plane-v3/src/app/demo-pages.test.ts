import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(appDir, '..');

async function readSource(relativePath: string) {
  const absolutePath = path.join(srcDir, relativePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('demo sandbox positioning', () => {
  it('ships a demo hub that explains the sandbox boundary and links to prototype routes', async () => {
    const source = await readSource('app/demo/page.tsx');

    expect(source).toMatch(/Sandbox Directory/);
    expect(source).toMatch(/prototype routes separate from the backend-backed console/i);
    expect(source).toMatch(/\/demo\/identities/);
    expect(source).toMatch(/\/demo\/spaces/);
    expect(source).toMatch(/\/identities/);
    expect(source).toMatch(/\/spaces/);
  });

  it('keeps the demo shell framed as a non-production sandbox with clear exit criteria', async () => {
    const source = await readSource('app/demo/layout.tsx');

    expect(source).toMatch(/Demo Sandbox/);
    expect(source).toMatch(/non-production/);
    expect(source).toMatch(/interaction experiments/i);
    expect(source).toMatch(/Remove this sandbox once/i);
    expect(source).toMatch(/Back to Sandbox Directory/);
    expect(source).toMatch(/href="\/demo"|href='\/demo'|href=\{['"]\/demo['"]\}/);
    expect(source).toMatch(/View live identities/);
    expect(source).toMatch(/View live spaces/);
  });

  it('frames demo identities as an interaction sandbox rather than the live management page', async () => {
    const source = await readSource('app/demo/identities/page.tsx');

    expect(source).toMatch(/identity interaction sandbox/i);
    expect(source).toMatch(/not the live management roster/i);
    expect(source).toMatch(/Back to Sandbox Directory/);
    expect(source).toMatch(/View live identities/);
    expect(source).toMatch(/\/identities/);
  });

  it('frames demo spaces as a prototype instead of the events-backed operations surface', async () => {
    const source = await readSource('app/demo/spaces/page.tsx');

    expect(source).toMatch(/collaboration prototype/i);
    expect(source).toMatch(/not the inbox or events-backed operations workspace/i);
    expect(source).toMatch(/Back to Sandbox Directory/);
    expect(source).toMatch(/View live spaces/);
    expect(source).toMatch(/\/spaces/);
  });

  it('does not expose demo routes in the primary console navigation', async () => {
    const sources = await Promise.all([
      readSource('interfaces/human/layout/sidebar.tsx'),
      readSource('components/mobile-nav.tsx'),
      readSource('components/tablet-sidebar.tsx'),
    ]);

    for (const source of sources) {
      expect(source).not.toMatch(/\/demo(\/|['"])/);
    }
  });
});
