import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const layoutDir = path.dirname(fileURLToPath(import.meta.url));

async function readLayoutSource() {
  const absolutePath = path.join(layoutDir, 'index.tsx');
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('shared layout fallbacks', () => {
  it('localizes shared loading and initialization error copy', async () => {
    const source = await readLayoutSource();

    expect(source).toMatch(/useI18n/);
    expect(source).toMatch(/t\('common\.preparingPage'\)/);
    expect(source).toMatch(/t\('common\.unexpectedErrorTitle'\)/);
    expect(source).toMatch(/t\('common\.unexpectedErrorDescription'\)/);
    expect(source).toMatch(/t\('common\.retry'\)/);
  });

  it('owns the shell skip-link target landmark exactly once', async () => {
    const source = await readLayoutSource();

    expect(source).not.toMatch(/<SkipLink \/>/);
    expect(source.match(/id="main-content"/g)).toHaveLength(1);
  });
});
