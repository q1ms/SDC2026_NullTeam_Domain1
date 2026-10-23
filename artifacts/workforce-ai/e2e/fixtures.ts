import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

const builtInCsv = readFileSync(new URL('../public/data/ai-job-trends.csv', import.meta.url), 'utf8');
export const positiveCsv = [
  'role,sector,moderate_growth_pct,fast_growth_pct,moderate_resilience,fast_resilience,skills,sdgs',
  'Solar Planner,Energy,7,19,80,90,Excel|solar design,SDG 7|SDG 13',
  'Community Educator,Education,3,11,75,85,Communication|facilitation,SDG 4',
].join('\n');

export const test = base.extend<{ dashboard: Page }>({
  dashboard: async ({ page, context, baseURL }, use) => {
    const unexpected: string[] = [];
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const origin = new URL(baseURL!).origin;
    // Fail closed: an accidental AI call or new external dependency must never
    // reach OpenRouter (or any other live service), even on a failing test.
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/healthz' && request.method() === 'GET') {
          await route.fulfill({ json: { status: 'ok' } });
        } else {
          unexpected.push(`${request.method()} ${url.pathname}`);
          await route.fulfill({ status: 503, json: { error: 'Live API disabled in frontend regression tests.' } });
        }
      } else if (url.origin !== origin) {
        // Fonts are decorative and need not depend on Google's availability.
        if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
          unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
        }
        await route.abort();
      } else if (url.pathname.endsWith('/data/ai-job-trends.csv')) {
        await route.fulfill({ contentType: 'text/csv', body: builtInCsv });
      } else {
        await route.continue();
      }
    });
    await page.goto('./');
    await expect(page.getByTestId('button-try-sample')).toBeVisible();
    await page.getByTestId('button-try-sample').click();
    await page.getByTestId('button-start-journey').click();
    await expect(page.getByTestId('panel-journey-results')).toBeVisible();
    await expect(page.locator('[data-testid^="row-role-"]')).toHaveCount(3);
    await use(page);
    expect(unexpected, 'Unexpected network calls (all were blocked)').toEqual([]);
    expect(pageErrors, 'Uncaught frontend errors').toEqual([]);
  },
});

export { expect };

export async function importPositiveCsv(page: Page) {
  await page.getByTestId('input-role-csv').setInputFiles({
    name: 'positive-only.csv', mimeType: 'text/csv', buffer: Buffer.from(positiveCsv),
  });
  await expect(page.getByTestId('row-role-role-0')).toContainText('Solar Planner');
  await expect(page.getByTestId('row-role-role-1')).toContainText('Community Educator');
  await expect(page.locator('[data-testid^="row-role-"]')).toHaveCount(2);
}

export async function litSdgs(page: Page) {
  return page.getByTestId('panel-sdgs').locator('li b').allTextContents();
}
