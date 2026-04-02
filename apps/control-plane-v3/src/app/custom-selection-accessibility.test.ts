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

describe('custom selection accessibility', () => {
  it('marks task target-mode cards as pressed state toggles', async () => {
    const source = await readRouteSource('tasks/page.tsx');

    expect(source).toMatch(/aria-pressed=\{taskForm\.target_mode === 'explicit_tokens'\}/);
    expect(source).toMatch(/aria-pressed=\{taskForm\.target_mode === 'broadcast'\}/);
  });

  it('marks capability access-mode chips as pressed state toggles', async () => {
    const source = await readRouteSource('assets/page.tsx');

    expect(source).toMatch(/aria-pressed=\{capabilityForm\.access_mode === 'all_tokens'\}/);
    expect(source).toMatch(/aria-pressed=\{capabilityForm\.access_mode === 'specific_tokens'\}/);
    expect(source).toMatch(/aria-pressed=\{capabilityForm\.access_mode === 'specific_agents'\}/);
    expect(source).toMatch(/aria-pressed=\{capabilityForm\.access_mode === 'token_label'\}/);
  });

  it('marks demo identity filter chips as pressed state toggles', async () => {
    const source = await readRouteSource('demo/identities/page.tsx');

    expect(source).toMatch(/aria-pressed=\{active\}/);
  });
});
