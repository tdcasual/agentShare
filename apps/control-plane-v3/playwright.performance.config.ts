import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const externalBaseUrl = process.env.VAULTGATE_PERFORMANCE_BASE_URL;
const systemChrome =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

export default defineConfig({
  testDir: './test/performance',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'PORT=3100 npm start',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop-performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: systemChrome ? { executablePath: systemChrome } : undefined,
      },
    },
    {
      name: 'mobile-performance',
      use: {
        ...devices['Pixel 7'],
        launchOptions: systemChrome ? { executablePath: systemChrome } : undefined,
      },
    },
  ],
});
