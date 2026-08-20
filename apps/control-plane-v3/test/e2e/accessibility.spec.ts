import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { appRoutes, mockSession } from './fixtures';

test.describe('WCAG A and AA', () => {
  test.beforeEach(async ({ page }) => mockSession(page));

  for (const route of appRoutes) {
    test(`${route} has no automated A/AA violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test('320px navigation retains an accessible brand name', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/spaces');
    await expect(page.locator('#main-content')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
