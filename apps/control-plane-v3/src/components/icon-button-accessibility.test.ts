import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const componentsDir = path.dirname(fileURLToPath(import.meta.url));

async function readComponentSource(relativePath: string) {
  const absolutePath = path.join(componentsDir, relativePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('icon button accessibility', () => {
  it('labels theme toggle buttons and exposes their pressed state', async () => {
    const source = await readComponentSource('theme-toggle.tsx');

    expect(source).toMatch(/useI18n/);
    expect(source).toMatch(/getThemeLabelKey\('light'\)/);
    expect(source).toMatch(/getThemeLabelKey\('dark'\)/);
    expect(source).toMatch(/getThemeLabelKey\('system'\)/);
    expect(source).toMatch(/aria-label=\{label\}/);
    expect(source).toMatch(/aria-pressed=\{isActive\}/);
    expect(source).toMatch(
      /aria-label=\{\s*isDark \? t\('settings\.theme\.switchToLight'\) : t\('settings\.theme\.switchToDark'\)\s*\}/
    );
  });
});
