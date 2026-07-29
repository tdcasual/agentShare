import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

const routes = [
  '/',
  '/agents',
  '/secrets',
  '/audit',
  '/settings/security',
  '/settings/management-tokens',
] as const;

test.describe('WCAG A and AA', () => {
  test.beforeEach(async ({ page }) => mockSession(page));

  for (const route of routes) {
    test(`${route} has no automated A/AA violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
