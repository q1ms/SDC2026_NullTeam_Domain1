import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Use the existing artifact workflow through the shared proxy. No second dev
// server or API service is needed; every API request is intercepted by tests.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:80/workforce-ai/';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/repl/tools/bin/chromium') ? '/repl/tools/bin/chromium' : undefined);

export default defineConfig({
  testDir: './e2e',
  outputDir: '../../generated-artifacts/workforce-ai/test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `${baseURL.replace(/\/$/, '')}/`,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'desktop-chromium',
      testMatch: 'dashboard.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile-chromium',
      testMatch: 'mobile.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
