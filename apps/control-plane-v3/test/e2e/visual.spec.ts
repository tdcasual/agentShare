import { expect, test } from '@playwright/test';
import {
  appRoutes,
  assertNoHorizontalOverflow,
  mockSession,
  mockUnauthenticated,
} from './fixtures';

// Baselines must track code changes only, never the host environment:
// pin timezone, locale, OS color scheme, and motion.
test.use({
  timezoneId: 'UTC',
  locale: 'en-US',
  colorScheme: 'light',
});

// Baseline matrix is deliberately small (pages × chromium + mobile-chrome,
// light theme only). The webkit project still runs every functional spec;
// re-recording baselines after the UI rebuild resets this matrix anyway.
test.skip(
  ({ browserName }) => browserName === 'webkit',
  'visual matrix is chromium + mobile-chrome only'
);

const screenshotName = (route: string) =>
  `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}.png`;

test.describe('visual baselines', () => {
  test.beforeEach(async ({ page }) => {
    // next-themes: pin light so baselines never chase the OS theme.
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    // Kill CSS transitions/animations so frames never land mid-motion.
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('/login renders a stable baseline', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/login');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page).toHaveScreenshot(screenshotName('/login'), { fullPage: true });
    await assertNoHorizontalOverflow(page);
  });

  for (const route of appRoutes) {
    test(`${route} renders a stable baseline`, async ({ page }) => {
      await mockSession(page);
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page).toHaveScreenshot(screenshotName(route), { fullPage: true });
      await assertNoHorizontalOverflow(page);
    });
  }
});
