import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const componentsDir = path.dirname(fileURLToPath(import.meta.url));

async function readProviderSource() {
  const absolutePath = path.join(componentsDir, 'i18n-provider.tsx');
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('i18n provider locale persistence', () => {
  it('persists the active locale to a cookie for server-rendered shell localization', async () => {
    const source = await readProviderSource();

    expect(source).toContain('document.cookie');
    expect(source).toContain("const LOCALE_COOKIE_NAME = 'app-locale'");
    expect(source).toContain('${LOCALE_COOKIE_NAME}');
  });
});
