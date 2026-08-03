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
      serverTtfb: navigation.responseStart - navigation.requestStart,
      fcpAfterResponse: (paint?.startTime ?? 0) - navigation.responseStart,
      lcpAfterResponse: vitals.lcp - navigation.responseStart,
    };
  });

  console.warn(`WEB_VITALS ${testInfo.project.name} ${JSON.stringify(metrics)}`);
  expect(metrics.fcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.inp).toBeLessThan(200);

  if (process.env.VAULTGATE_PERFORMANCE_BASE_URL) {
    // Public probes include DNS, TCP and TLS variance outside the app's
    // control. Keep broad end-to-end ceilings, then enforce the strict
    // server and render budgets after the connection is established.
    expect(metrics.ttfb).toBeLessThan(3_000);
    expect(metrics.fcp).toBeLessThan(5_000);
    expect(metrics.lcp).toBeLessThan(6_000);
    expect(metrics.serverTtfb).toBeLessThan(800);
    expect(metrics.fcpAfterResponse).toBeLessThan(1_800);
    expect(metrics.lcpAfterResponse).toBeLessThan(2_500);
  } else {
    expect(metrics.fcp).toBeLessThan(1_800);
    expect(metrics.lcp).toBeLessThan(2_500);
    expect(metrics.ttfb).toBeLessThan(800);
  }
});

test('large Spaces token inventory stays responsive', async ({ page }, testInfo) => {
  test.skip(
    Boolean(process.env.VAULTGATE_PERFORMANCE_BASE_URL),
    'The production performance probe does not use administrator credentials.'
  );
  const tokens = Array.from({ length: 50 }, (_, index) => ({
    id: `token-${index}`,
    agent_id: `agent-${index}`,
    agent_name: `Agent ${String(index).padStart(3, '0')}`,
    name: `Runtime ${String(index).padStart(3, '0')}`,
    description: null,
    status: 'active',
    key_prefix: `vg_${String(index).padStart(4, '0')}`,
    expires_at: null,
    last_used_at: null,
    created_at: '2026-01-01T00:00:00Z',
  }));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const responses: Record<string, unknown> = {
      '/api/admin/bootstrap/status': { setup_required: false },
      '/api/admin/session': { id: 'admin', email: 'admin@example.com', auth_type: 'session' },
      '/api/admin/spaces': {
        items: [{ id: 'space-1', name: 'Production', description: null, status: 'active' }],
      },
      '/api/admin/spaces/space-1/memberships': { members: [] },
      '/api/admin/tokens': { items: tokens, total: 10_000, limit: 50, offset: 0 },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses[path] ?? { items: [] }),
    });
  });

  const startedAt = Date.now();
  await page.goto('/spaces');
  await expect(page.getByText('Agent 049')).toBeVisible();
  const renderMs = Date.now() - startedAt;
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  console.warn(
    `SPACES_PERFORMANCE ${testInfo.project.name} ${JSON.stringify({ render_ms: renderMs })}`
  );
  expect(renderMs).toBeLessThan(2_500);
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.getByRole('navigation', { name: /分页导航|Pagination/ })).toBeVisible();
});
