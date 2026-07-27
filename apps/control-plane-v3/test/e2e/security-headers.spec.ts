import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test('framework and theme scripts comply with the nonce CSP', async ({ page }) => {
  await mockSession(page);
  const policyViolations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
      policyViolations.push(message.text());
    }
  });

  const response = await page.goto('/');
  const policy = response?.headers()['content-security-policy'] ?? '';

  expect(policy).toContain("script-src 'self' 'nonce-");
  expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(policy).toContain("object-src 'none'");
  await expect(page.locator('#main-content')).toBeVisible();

  const inlineScriptsWithoutNonce = await page
    .locator('script:not([src])')
    .evaluateAll((scripts) =>
      scripts
        .filter((script) => !(script as HTMLScriptElement).nonce)
        .map((script) => script.outerHTML)
    );
  expect(inlineScriptsWithoutNonce).toEqual([]);
  expect(policy).toContain("'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='");
  expect(policyViolations).toEqual([]);
});
