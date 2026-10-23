import { test, expect, importPositiveCsv, litSdgs } from './fixtures';

test('touch selection keeps the mobile role, quest and SDGs consistent without horizontal overflow', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('row-role-role-0').tap();
  await page.getByTestId('link-section-route').tap();
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Solar Planner');
  await page.getByTestId('link-section-skills-sdgs').tap();
  await expect.poll(() => litSdgs(page)).toEqual(['SDG 7', 'SDG 13']);
  await page.getByTestId('link-section-recommendations').tap();
  await page.getByTestId('button-scenario-fast').tap();
  await expect(page.getByTestId('row-role-role-0')).toContainText('+19%');
  await page.getByTestId('row-role-role-1').tap();
  await page.getByTestId('link-section-route').tap();
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  await page.getByTestId('link-section-skills-sdgs').tap();
  await expect.poll(() => litSdgs(page)).toEqual(['SDG 4']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.reload();
  await expect(page.getByTestId('row-role-role-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('button-scenario-fast')).toHaveAttribute('aria-pressed', 'true');
});

test('mobile skills editing supports a gap-free quest and confirmed profile reset', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('row-role-role-1').tap();
  await page.getByTestId('link-section-route').tap();
  await expect(page.getByTestId('quest-gap-0')).toContainText('facilitation');
  await page.getByTestId('button-edit-skills').tap();
  await page.getByTestId('input-add-skill').fill('facilitation');
  await page.getByTestId('button-add-skill').tap();
  await page.getByTestId('button-start-journey').tap();
  await page.getByTestId('link-section-route').tap();
  await expect(page.getByTestId('text-quest-complete')).toBeVisible();
  await expect(page.getByTestId('quest-map').locator('[data-testid^="quest-gap-"]')).toHaveCount(0);
  await expect(page.getByTestId('quest-map').locator('[data-testid^="link-course-"]')).toHaveCount(0);
  await expect(page.getByTestId('quest-step-current')).toContainText('facilitation');
  page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('button-clear-profile').tap();
  await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  await expect(page.getByTestId('text-data-disclaimer')).toContainText('illustrative');
});
