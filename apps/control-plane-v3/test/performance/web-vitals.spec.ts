import { expect, test } from '@playwright/test';

interface VitalState {
  cls: number;
  inp: number;
  lcp: number;
}

test('login shell stays within the web performance budget', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const state: VitalState = { cls: 0, inp: 0, lcp: 0 };
    (window as Window & { __vaultgateVitals?: VitalState }).__vaultgateVitals = state;

    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        state.lcp = entries.at(-1)?.startTime ?? state.lcp;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) {
            state.cls += shift.value ?? 0;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes('event')) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.inp = Math.max(state.inp, entry.duration);
        }
      });
      const options: PerformanceObserverInit & { durationThreshold: number } = {
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      };
      observer.observe(options);
    }
  });

  if (!process.env.VAULTGATE_PERFORMANCE_BASE_URL) {
    await page.route('**/api/admin/bootstrap/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"setup_required":false}',
      })
    );
    await page.route('**/api/admin/session', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"detail":"Unauthorized"}',
      })
    );
  }

  const response = await page.goto('/login', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /登录|Sign in/ })).toBeVisible();

  const firstButton = page.getByRole('button').first();
  if (await firstButton.isVisible()) {
    await firstButton.click();
  }
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    const vitals = (window as Window & { __vaultgateVitals?: VitalState }).__vaultgateVitals ?? {
      cls: 0,
      inp: 0,
      lcp: 0,
    };
    return {
      cls: vitals.cls,
      fcp: paint?.startTime ?? 0,
      inp: vitals.inp,
      lcp: vitals.lcp,
      ttfb: navigation.responseStart,
    };
  });

  console.warn(`WEB_VITALS ${testInfo.project.name} ${JSON.stringify(metrics)}`);
  expect(metrics.fcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.fcp).toBeLessThan(1_800);
  expect(metrics.lcp).toBeLessThan(2_500);
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.inp).toBeLessThan(200);
  expect(metrics.ttfb).toBeLessThan(800);
});
