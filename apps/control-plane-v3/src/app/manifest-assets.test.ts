import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(appDir, '..', '..');
const publicDir = path.join(projectDir, 'public');

interface WebManifest {
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
}

describe('manifest assets', () => {
  it('ships every icon declared in the web manifest', async () => {
    const manifestPath = path.join(publicDir, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as WebManifest;

    expect(manifest.icons?.length).toBeGreaterThan(0);

    for (const icon of manifest.icons ?? []) {
      const relativePath = icon.src.replace(/^\//, '');
      await expect(access(path.join(publicDir, relativePath))).resolves.toBeUndefined();
    }
  });
});
