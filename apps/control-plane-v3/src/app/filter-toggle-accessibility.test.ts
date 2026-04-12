import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.join(appDir, '..', 'shared', 'ui-primitives');

async function readSource(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(appDir, filePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('filter toggle accessibility', () => {
  it('shared FilterButton renders aria-pressed', async () => {
    const source = await readSource(path.join(sharedDir, 'filter-button.tsx'));

    expect(source).toMatch(/aria-pressed=\{active\}/);
  });

  it('marketplace, tasks, reviews, assets, and settings use shared FilterButton', async () => {
    const pages = ['marketplace/page.tsx', 'tasks/page.tsx', 'reviews/page.tsx', 'assets/page.tsx', 'settings/page.tsx'];
    const sources = await Promise.all(pages.map((p) => readSource(p)));

    for (let i = 0; i < pages.length; i++) {
      expect(sources[i]).toMatch(/FilterButton/);
    }
  });

  it('marks asset filters as pressed state toggles', async () => {
    const source = await readSource('assets/page.tsx');

    expect(source).toMatch(/FilterButton/);
  });

  it('marks settings, spaces, and tokens filters as pressed state toggles', async () => {
    const [
      settingsSource,
      _spacesSource,
      operationsFeedSource,
      governancePanelSource,
      tokensSource,
    ] = await Promise.all([
      readSource('settings/page.tsx'),
      readSource('spaces/page.tsx'),
      readSource('spaces/operations-feed.tsx'),
      readSource('spaces/governance-panel.tsx'),
      readSource('tokens/page.tsx'),
    ]);

    expect(settingsSource).toMatch(/FilterButton/);
    // Spaces page aria-pressed attributes are now in sub-components
    expect(operationsFeedSource).toMatch(/aria-pressed=\{selectedAgentId === null\}/);
    expect(operationsFeedSource).toMatch(/aria-pressed=\{selectedEventType === 'all'\}/);
    expect(governancePanelSource).toMatch(/aria-pressed=\{selectedStatus === 'all'\}/);
    expect(tokensSource).toMatch(/aria-pressed=\{selectedHealthFilter === 'all'\}/);
  });
});
