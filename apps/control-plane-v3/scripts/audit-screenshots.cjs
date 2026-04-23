const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'output', 'playwright', 'audit');

const devices = [
  { name: 'mobile_320', width: 320, height: 568 },
  { name: 'mobile_375', width: 375, height: 667 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'tablet_portrait', width: 768, height: 1024 },
  { name: 'tablet_landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

const pages = [
  { name: 'hub', path: '/' },
  { name: 'tasks', path: '/tasks' },
  { name: 'inbox', path: '/inbox' },
  { name: 'identities', path: '/identities' },
  { name: 'tokens', path: '/tokens' },
  { name: 'settings', path: '/settings' },
];

async function login(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  await page.fill('input[type="email"], input[name="email"]', 'admin@test.com');
  await page.fill('input[type="password"], input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  await page.waitForTimeout(1000);

  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const storageState = await login(browser);

  for (const pageConfig of pages) {
    for (const device of devices) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        storageState,
        userAgent: device.width < 768
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
          : device.width < 1024
            ? 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
            : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });

      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}${pageConfig.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(2000);

        const fileName = `${pageConfig.name}_${device.name}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`✓ ${fileName}`);
      } catch (err) {
        console.error(`✗ ${pageConfig.name}_${device.name}: ${err.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
