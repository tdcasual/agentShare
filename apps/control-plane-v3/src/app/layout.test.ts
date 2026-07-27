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

async function readNextConfigSource() {
  return readFile(path.join(appDir, '../../next.config.mjs'), 'utf8');
}

async function readProxySource() {
  return readFile(path.join(appDir, '../proxy.ts'), 'utf8');
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

  it('renders the skip link before the guarded navigation shell', async () => {
    const source = await readLayoutSource();
    const skipLinkPosition = source.indexOf('href="#main-content"');
    const routeGuardPosition = source.indexOf('<RouteGuard>');

    expect(skipLinkPosition).toBeGreaterThan(-1);
    expect(routeGuardPosition).toBeGreaterThan(-1);
    expect(skipLinkPosition).toBeLessThan(routeGuardPosition);
  });

  it('passes the request nonce to the theme bootstrap script', async () => {
    const source = await readLayoutSource();

    expect(source).toMatch(/headers\(\)/);
    expect(source).toContain("requestHeaders.get('x-nonce')");
    expect(source).toContain('nonce={nonce}');
  });

  it('uses a dynamic nonce policy instead of unsafe inline scripts', async () => {
    const [proxySource, configSource] = await Promise.all([
      readProxySource(),
      readNextConfigSource(),
    ]);

    expect(proxySource).toContain("'nonce-${nonce}'");
    expect(proxySource).not.toMatch(/script-src[^\n]*unsafe-inline/);
    expect(configSource).not.toContain('Content-Security-Policy');
  });
});
