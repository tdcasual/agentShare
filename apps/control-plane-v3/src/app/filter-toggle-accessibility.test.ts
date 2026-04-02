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

describe('filter toggle accessibility', () => {
  it('marks marketplace filter buttons as pressed state toggles', async () => {
    const source = await readRouteSource('marketplace/page.tsx');

    expect(source).toMatch(/aria-pressed=\{selectedFilter === item\.key\}/);
  });

  it('marks tasks filters as pressed state toggles', async () => {
    const source = await readRouteSource('tasks/page.tsx');

    expect(source).toMatch(/aria-pressed=\{selectedTaskFilter === 'all'\}/);
    expect(source).toMatch(/aria-pressed=\{selectedTaskFilter === 'needs_feedback'\}/);
    expect(source).toMatch(/aria-pressed=\{selectedTaskFilter === 'in_flight'\}/);
  });

  it('marks review filters as pressed state toggles', async () => {
    const source = await readRouteSource('reviews/page.tsx');

    expect(source).toMatch(/aria-pressed=\{selectedProvenance === 'all'\}/);
    expect(source).toMatch(/aria-pressed=\{selectedKind === 'all'\}/);
  });

  it('marks asset filters as pressed state toggles', async () => {
    const source = await readRouteSource('assets/page.tsx');

    expect(source).toMatch(/aria-pressed=\{selectedPublicationFilter === 'all'\}/);
    expect(source).toMatch(/aria-pressed=\{selectedResourceFilter === 'all'\}/);
  });

  it('marks settings, spaces, and tokens filters as pressed state toggles', async () => {
    const [settingsSource, spacesSource, tokensSource] = await Promise.all([
      readRouteSource('settings/page.tsx'),
      readRouteSource('spaces/page.tsx'),
      readRouteSource('tokens/page.tsx'),
    ]);

    expect(settingsSource).toMatch(/aria-pressed=\{selectedRosterFilter === 'all'\}/);
    expect(spacesSource).toMatch(/aria-pressed=\{selectedAgentId === null\}/);
    expect(spacesSource).toMatch(/aria-pressed=\{selectedEventType === 'all'\}/);
    expect(spacesSource).toMatch(/aria-pressed=\{selectedReviewStatus === 'all'\}/);
    expect(tokensSource).toMatch(/aria-pressed=\{selectedHealthFilter === 'all'\}/);
  });
});
