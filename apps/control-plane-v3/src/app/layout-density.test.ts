import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(appDir, '..');

async function readSource(relativePath: string) {
  const absolutePath = path.join(srcDir, relativePath);
  await access(absolutePath);
  return readFile(absolutePath, 'utf8');
}

describe('console layout density', () => {
  it('keeps global mobile chrome compact', async () => {
    const headerSource = await readSource('interfaces/human/layout/header.tsx');
    const mobileNavSource = await readSource('components/mobile-nav.tsx');

    expect(headerSource).toContain('max-w-xl');
    expect(mobileNavSource).toContain('min-h-[44px]');
    expect(mobileNavSource).toContain('px-2 py-2');
    expect(mobileNavSource).toContain('text-[10px]');
  });

  it('uses compact metrics and responsive asset summaries', async () => {
    const metricSource = await readSource('shared/ui-primitives/metric.tsx');
    const cardSource = await readSource('shared/ui-primitives/card.tsx');
    const assetsSource = await readSource('app/assets/page.tsx');
    const approvalsSource = await readSource('app/approvals/page.tsx');
    const settingsSource = await readSource('app/settings/page.tsx');
    const tokensSource = await readSource('app/tokens/page.tsx');
    const reviewsSource = await readSource('app/reviews/page.tsx');

    // Card component provides the base responsive padding
    expect(cardSource).toContain('p-3 sm:p-4 md:p-6');
    // Metric values scale down on mobile
    expect(metricSource).toContain('text-2xl');
    expect(metricSource).toContain('sm:text-3xl');
    // Metric labels use compact mobile font sizes
    expect(metricSource).toMatch(/text-\[10px\]|text-\[11px\]|text-xs/);
    expect(metricSource).toMatch(/sm:text-xs|sm:text-sm/);
    // Grid layouts with responsive gaps
    expect(assetsSource).toMatch(/grid gap-4/);
    expect(approvalsSource).toMatch(/grid.*gap-4/);
    expect(settingsSource).toMatch(/grid.*gap-3/);
    expect(tokensSource).toMatch(/grid.*gap-3/);
    expect(reviewsSource).toMatch(/grid.*gap-4/);
  });

  it('keeps page copy secondary on mobile operation screens', async () => {
    const pageSources = await Promise.all([
      readSource('app/assets/page.tsx'),
      readSource('app/tasks/page.tsx'),
      readSource('app/reviews/page.tsx'),
      readSource('app/runs/page.tsx'),
      readSource('app/settings/page.tsx'),
    ]);
    const pageHeaderSource = await readSource('shared/ui-primitives/page-header.tsx');

    // PageHeader centralises the hidden/sm:block pattern for page descriptions
    expect(pageHeaderSource).toContain('hidden');
    expect(pageHeaderSource).toContain('sm:block');

    // Pages using PageHeader or responsive hidden classes
    for (const source of pageSources) {
      const hasPageHeader = source.includes('PageHeader') || source.includes('hidden');
      expect(hasPageHeader).toBe(true);
    }
  });

  it('keeps marketplace and spaces heroes compact on mobile', async () => {
    const marketplaceSource = await readSource('app/marketplace/page.tsx');
    const spacesSource = await readSource('app/spaces/page.tsx');

    // Hero sections with responsive padding
    expect(marketplaceSource).toMatch(/p-4 .*sm:p-6 .*lg:p-8/);
    expect(marketplaceSource).toContain('text-2xl');
    expect(marketplaceSource).toContain('sm:text-4xl');
    expect(spacesSource).toContain('text-2xl');
    expect(spacesSource).toContain('sm:text-4xl');
    expect(spacesSource).toMatch(/grid.*gap-3/);
    expect(spacesSource).toMatch(/sm:grid-cols-3/);
  });

  it('keeps hub lists and secondary copy dense on mobile', async () => {
    const hubSource = await readSource('app/page.tsx');
    const pageHeaderSource = await readSource('shared/ui-primitives/page-header.tsx');

    // Hub description responsive classes now live in PageHeader component
    expect(pageHeaderSource).toContain('hidden text-[var(--kw-text-muted)] sm:block');
    // Hub uses responsive grid and padding
    expect(hubSource).toMatch(/grid grid-cols-1 gap-4/);
    expect(hubSource).toContain('p-3 sm:p-4');
    expect(hubSource).toMatch(/hidden.*md:inline|hidden.*sm:block/);
  });

  it('uses tighter default card spacing on mobile', async () => {
    const cardSource = await readSource('shared/ui-primitives/card.tsx');

    expect(cardSource).toContain('p-3 sm:p-4 md:p-6');
    expect(cardSource).toContain('mb-3 flex flex-col gap-1 sm:mb-4 sm:gap-2');
  });

  it('keeps agent detail tabs on one scrollable row on narrow screens', async () => {
    const agentDetailSource = await readSource('app/identities/[agentId]/page.tsx');

    expect(agentDetailSource).toContain('overflow-x-auto');
    expect(agentDetailSource).toContain('flex-nowrap');
  });
});
