import { describe, expect, it } from 'vitest';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

async function readLayoutSource() {
  const absolutePath = path.join(appDir, 'layout.tsx');
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('root layout localization', () => {
  it('derives document lang and skip link copy from the persisted locale', async () => {
    const source = await readLayoutSource();

    expect(source).toMatch(/from 'next\/headers'/);
    expect(source).toMatch(/cookies\(/);
    expect(source).not.toContain('<html lang="zh-CN"');
    expect(source).not.toContain('跳转到主要内容');
  });

  it('derives metadata title and description from localized message bundles', async () => {
    const source = await readLayoutSource();

    expect(source).toMatch(/export async function generateMetadata/);
    expect(source).toMatch(/rootLayoutMessages\[locale\]\.metadata/);
    expect(source).toMatch(/localizedMetadata\.appName/);
    expect(source).toMatch(/localizedMetadata\.description/);
    expect(source).not.toContain("title: 'Control Plane V3 - 双生宇宙'");
    expect(source).not.toContain("description: '人类与智能体共享的控制平面，支持离线使用'");
  });

  it('does not duplicate the shell skip-link target landmark', async () => {
    const source = await readLayoutSource();

    expect(source).not.toContain('<main id="main-content">{children}</main>');
  });
});
