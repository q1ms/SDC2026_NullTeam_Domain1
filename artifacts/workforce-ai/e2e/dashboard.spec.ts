import { readFile } from 'node:fs/promises';
import { test, expect, importPositiveCsv, litSdgs, positiveCsv } from './fixtures';

const storageKey = 'career-futures.journey';
const openSection = (page: import('@playwright/test').Page, section: string) =>
  page.getByTestId(`link-section-${section}`).click();

test('Moderate → Fast → Moderate uses actual projections and retains a viable selection', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('row-role-role-0').click();
  await expect(page.getByTestId('row-role-role-0')).toContainText('+7%');
  await expect(page.getByTestId('row-role-role-1')).toContainText('+3%');
  await page.getByTestId('button-scenario-fast').click();
  await expect(page.getByTestId('button-scenario-fast')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('row-role-role-0')).toContainText('+19%');
  await expect(page.getByTestId('row-role-role-1')).toContainText('+11%');
  await expect(page.getByTestId('row-role-role-0')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('button-scenario-moderate').click();
  await expect(page.getByTestId('row-role-role-0')).toContainText('+7%');
  await expect(page.locator('.jr-risk')).toHaveCount(0);
  await expect(page.getByTestId('text-data-disclaimer')).toContainText('your imported CSV');
});

test('role selection keeps gaps, SDGs and quest in sync', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('row-role-role-0').click();
  await expect(page.getByRole('tabpanel')).toContainText('Solar Planner');
  await expect(page.getByTestId('row-role-role-0')).toHaveAttribute('aria-selected', 'true');
  await openSection(page, 'route');
  const quest = page.getByTestId('quest-map');
  await expect(quest.getByRole('heading')).toHaveText('Your route toward Solar Planner');
  await expect(quest.getByTestId('quest-gap-0')).toContainText('solar design');
  await expect(quest.getByTestId('link-course-0')).toHaveAttribute('href', /^https:\/\//);
  await expect(quest.getByTestId('link-course-0')).toHaveAttribute('rel', 'noopener noreferrer');
  await openSection(page, 'skills-sdgs');
  await expect.poll(() => litSdgs(page)).toEqual(['SDG 7', 'SDG 13']);
  await expect(page.getByTestId('panel-skills-gap').locator('li')).toHaveText(['solar design']);
  await openSection(page, 'recommendations');
  await page.getByTestId('row-role-role-1').click();
  await openSection(page, 'route');
  await expect(quest.getByRole('heading')).toHaveText('Your route toward Community Educator');
  await openSection(page, 'skills-sdgs');
  await expect.poll(() => litSdgs(page)).toEqual(['SDG 4']);
  await expect(page.getByTestId('panel-skills-gap').locator('li')).toHaveText(['facilitation']);
});

test('editing skills updates fit, gaps and quest without losing the selected role', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('row-role-role-0').click();
  const before = (await page.getByTestId('row-role-role-0').textContent())!;
  await openSection(page, 'route');
  await page.getByTestId('button-edit-skills').click();
  await page.getByTestId('button-remove-skill-excel').click();
  await page.getByTestId('button-start-journey').click();
  await expect(page.getByTestId('row-role-role-0')).not.toHaveText(before);
  await openSection(page, 'skills-sdgs');
  await expect(page.getByTestId('panel-skills-gap').locator('li')).toHaveText(['Excel', 'solar design']);
  await page.getByTestId('button-edit-skills').click();
  await page.getByTestId('input-add-skill').fill('Excel');
  await page.getByTestId('button-add-skill').click();
  await page.getByTestId('button-start-journey').click();
  await openSection(page, 'recommendations');
  await expect(page.getByTestId('row-role-role-0')).toHaveText(before);
  await openSection(page, 'skills-sdgs');
  await expect(page.getByTestId('panel-skills-gap').locator('li')).toHaveText(['solar design']);
});

test('downloaded plans follow the selected role, scenario, skills and visible resources', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  for (const role of [
    { id: 'role-0', title: 'Solar Planner', growth: '7', scenario: 'Moderate' },
    { id: 'role-1', title: 'Community Educator', growth: '11', scenario: 'Fast' },
  ]) {
    await openSection(page, 'recommendations');
    if (role.scenario === 'Fast') await page.getByTestId('button-scenario-fast').click();
    await page.getByTestId(`row-role-${role.id}`).click();
    await openSection(page, 'route');
    const courses = await page.getByTestId('quest-map').locator('a').evaluateAll(links =>
      links.map(link => ({ title: link.textContent!, url: (link as HTMLAnchorElement).href })));
    const downloading = page.waitForEvent('download');
    await page.getByTestId('button-export-plan').click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('future-ready-plan.txt');
    const text = await readFile((await download.path())!, 'utf8');
    expect(text).toContain(`Scenario: ${role.scenario} AI disruption`);
    expect(text).toContain(`Selected role: ${role.title}`);
    expect(text).toContain(`outlook ${role.growth}%`);
    expect(text).toContain(`Goal (aspirational target): ${role.title}`);
    expect(text).toContain('Current skills: Project management, Data analysis, Communication, Problem solving, Excel, Team leadership');
    for (const course of courses) {
      expect(text).toContain(course.title);
      expect(text).toContain(course.url);
    }
  }
});

test('keyboard users can select a role, change disruption and edit their skills', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  const row = page.getByTestId('row-role-role-1');
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Community Educator');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  await openSection(page, 'recommendations');
  await page.getByTestId('button-scenario-fast').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('button-scenario-fast')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-edit-skills').focus();
  await page.keyboard.press('Enter');
  const input = page.getByTestId('input-add-skill');
  await input.fill('facilitation');
  await input.press('Enter');
  await page.getByTestId('button-start-journey').click();
  await expect(page.getByTestId('panel-journey-results')).toBeFocused();
  await openSection(page, 'route');
  await expect(page.getByTestId('text-quest-complete')).toBeVisible();
});

test('sidebar navigation and role tabs work with keyboard input', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  const first = page.getByTestId('row-role-role-0');
  const second = page.getByTestId('row-role-role-1');
  const panel = page.getByRole('tabpanel');

  await expect(page.getByRole('tablist', { name: 'Recommended roles' }).getByRole('tab')).toHaveCount(2);
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  await expect(panel).toHaveAttribute('aria-labelledby', 'role-tab-1');
  await expect(panel).toContainText('Community Educator');
  await expect(page.getByTestId('quest-map')).toHaveCount(0);
  await expect(page.getByTestId('panel-skills-gap')).toHaveCount(0);

  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  await expect(page.getByTestId('section-recommendations')).toHaveCount(0);
  await openSection(page, 'skills-sdgs');
  await expect(page.getByTestId('panel-skills-gap')).toBeVisible();
  await expect(page.getByTestId('quest-map')).toHaveCount(0);
  await expect(page.getByTestId('link-section-skills-sdgs')).toHaveAttribute('aria-current', 'page');
});

test('sidebar collapses to centered icons and each view stays focused', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  const nav = page.getByRole('navigation', { name: 'Career plan sections' });
  const toggle = page.getByTestId('button-toggle-sidebar');

  await expect(page.locator('.jr-brand')).toHaveText('jAIX');
  await expect(page.locator('.jr-bar').getByTestId('button-scenario-fast')).toHaveCount(0);
  await expect(page.getByTestId('section-recommendations')).toBeVisible();
  await expect(page.getByTestId('section-overview')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveAttribute('data-collapsed', 'true');
  await expect(page.getByTestId('link-section-overview')).toHaveCSS('justify-content', 'center');
  await expect(page.getByTestId('link-section-overview').locator('.jr-nav-text')).toHaveCSS('max-width', '0px');

  await openSection(page, 'overview');
  await expect(page.getByTestId('section-overview')).toBeVisible();
  await expect(page.getByTestId('section-recommendations')).toHaveCount(0);
  await openSection(page, 'recommendations');
  await expect(page.getByTestId('section-recommendations')).toBeVisible();
  await expect(page.getByTestId('section-overview')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map')).toBeVisible();
  await expect(page.getByTestId('panel-skills-gap')).toHaveCount(0);
});

test('light background follows the pointer and dashboard surfaces stay readable', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const background = page.locator('.jr-bg');
  const sidebar = page.locator('.jr-sidebar');
  const sidebarStyle = await sidebar.evaluate((node) => {
    const style = getComputedStyle(node);
    return { left: node.getBoundingClientRect().left, background: style.backgroundColor };
  });
  expect(sidebarStyle.left).toBeLessThan(40);
  expect(sidebarStyle.background).toBe('rgba(255, 255, 255, 0.42)');

  const contentBounds = await page.locator('.jr-results-content').evaluate((node) => {
    const { left, right } = node.getBoundingClientRect();
    return { left, right, viewportWidth: window.innerWidth };
  });
  expect(contentBounds.left).toBeGreaterThan(sidebarStyle.left);
  expect(Math.abs(contentBounds.right - (contentBounds.viewportWidth - 20))).toBeLessThan(3);

  const backgroundImage = page.locator('.jr-bg-image');
  const movingBox = page.locator('.jr-bg-float');
  const imageTransform = await backgroundImage.evaluate((node) => getComputedStyle(node).transform);
  const viewport = page.viewportSize();
  await page.mouse.move((viewport?.width ?? 1280) - 80, (viewport?.height ?? 800) - 80);
  await expect.poll(() => background.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-x')))).toBeGreaterThan(20);
  const initialBoxTransform = await movingBox.evaluate((node) => getComputedStyle(node).transform);
  await page.mouse.move(140, 180);
  await expect.poll(() => background.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-x')))).toBeLessThan(-25);
  expect(await backgroundImage.evaluate((node) => getComputedStyle(node).transform)).toBe(imageTransform);
  expect(await movingBox.evaluate((node) => getComputedStyle(node).transform)).not.toBe(initialBoxTransform);

  const surface = await page.getByTestId('section-recommendations').locator('.jr-recommendations').evaluate((node) => {
    const style = getComputedStyle(node);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(surface.color).toBe('rgb(23, 32, 51)');
  expect(surface.background).toBe('rgba(255, 255, 255, 0.3)');
});

test('refresh retains the complete imported journey and CSV replacement discards old identities', async ({ dashboard: page }) => {
  await importPositiveCsv(page);
  await page.getByTestId('button-scenario-fast').click();
  await page.getByTestId('row-role-role-1').click();
  await expect(page.getByTestId('status-device-storage')).toContainText('Saved on this device');
  await page.reload();
  await expect(page.getByTestId('button-scenario-fast')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('row-role-role-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('row-role-role-1')).toContainText('+11%');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  await expect(page.getByTestId('quest-step-current')).toContainText('Excel');
  await page.getByTestId('input-role-csv').setInputFiles({
    name: 'replacement.csv', mimeType: 'text/csv',
    buffer: Buffer.from(positiveCsv.replace('Solar Planner', 'Grid Planner').replace('Community Educator', 'Learning Coach')),
  });
  await openSection(page, 'recommendations');
  await expect(page.getByTestId('row-role-role-0')).toContainText('Grid Planner');
  await expect(page.getByTestId('row-role-role-0')).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(page.getByTestId('row-role-role-0')).toContainText('Grid Planner');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Grid Planner');
  await expect(page.getByTestId('text-data-disclaimer')).toContainText('your imported CSV');
  await expect(page.getByText('Community Educator', { exact: true })).toHaveCount(0);
});

test('built-in selection survives refresh and confirmed clearing removes only this profile', async ({ dashboard: page }) => {
  await page.getByTestId('button-scenario-fast').click();
  const row = page.locator('[data-testid^="row-role-"]').nth(1);
  const id = await row.getAttribute('data-testid');
  await row.click();
  const title = await row.locator('b').innerText();
  await page.reload();
  await expect(page.getByTestId(id!)).toHaveAttribute('aria-selected', 'true');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText(title);
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByTestId('button-clear-profile').click();
  await expect(page.getByTestId('panel-journey-results')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('button-clear-profile').click();
  await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  await page.reload();
  await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  await expect(page.getByTestId('text-data-disclaimer')).toContainText('illustrative');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot, storageKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
});

test('malformed and unsupported saved profiles recover with a notice', async ({ dashboard: page }) => {
  for (const raw of ['{', '{"version":2}', '{"version":1,"skills":false}']) {
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: storageKey, raw });
    await page.reload();
    await expect(page.getByTestId('text-storage-notice')).toContainText('invalid or from an unsupported version');
    await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
    await expect(page.getByTestId('button-start-journey')).toBeDisabled();
  }
});

test('Fast keeps an all-declining dataset honestly empty and Moderate restores its role', async ({ dashboard: page }) => {
  await page.getByTestId('input-role-csv').setInputFiles({
    name: 'declining.csv', mimeType: 'text/csv',
    buffer: Buffer.from([
      'role,sector,moderate_growth_pct,fast_growth_pct,moderate_resilience,fast_resilience,skills,sdgs',
      'Records Clerk,Admin,-3,-20,45,20,Excel|documentation,SDG 8',
    ].join('\n')),
  });
  await expect(page.getByTestId('row-role-role-0')).toContainText('Records Clerk');
  await page.getByTestId('button-scenario-fast').click();
  await expect(page.getByTestId('text-no-recommendations')).toContainText('no non-declining roles');
  await expect(page.getByTestId('quest-map')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('text-no-recommendations')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Moderate' }).click();
  await expect(page.getByTestId('row-role-role-0')).toContainText('-3%');
  await openSection(page, 'route');
  await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Records Clerk');
});

test('two tabs preserve active edits through CSV replacement and clearing until explicitly resolved', async ({ dashboard: first, context, baseURL }) => {
  await importPositiveCsv(first);
  await first.getByTestId('row-role-role-1').click();
  const second = await context.newPage();
  await second.goto(baseURL!);
  await expect(second.getByTestId('row-role-role-1')).toHaveAttribute('aria-selected', 'true');
  await expect(first.getByTestId('alert-storage-conflict')).toHaveCount(0);
  await second.getByTestId('button-edit-skills').click();
  await second.getByTestId('input-add-skill').fill('Unfinished skill');
  await expect(first.getByTestId('alert-storage-conflict')).toBeVisible();
  // Explicitly keep the first tab, then replace its CSV with colliding row IDs.
  first.once('dialog', dialog => dialog.accept());
  await first.getByTestId('button-keep-tab-profile').click();
  await first.getByTestId('input-role-csv').setInputFiles({
    name: 'replacement.csv', mimeType: 'text/csv',
    buffer: Buffer.from(positiveCsv.replace('Solar Planner', 'Grid Planner').replace('Community Educator', 'Learning Coach').replace(',19,', ',29,')),
  });
  await expect(second.getByTestId('alert-storage-conflict')).toBeVisible();
  await expect(second.getByTestId('input-add-skill')).toHaveValue('Unfinished skill');
  await second.getByTestId('button-add-skill').click();
  await expect(second.getByTestId('list-current-skills')).toContainText('Unfinished skill');
  expect(await first.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot.dataset.roles[0].title, storageKey)).toBe('Grid Planner');
  // Dismissing a resolution must leave both the local edits and conflict intact.
  second.once('dialog', dialog => dialog.dismiss());
  await second.getByTestId('button-load-saved-profile').click();
  await expect(second.getByTestId('list-current-skills')).toContainText('Unfinished skill');
  second.once('dialog', dialog => dialog.accept());
  await second.getByTestId('button-load-saved-profile').click();
  await openSection(second, 'recommendations');
  await expect(second.getByTestId('row-role-role-0')).toHaveAttribute('aria-selected', 'true');
  await openSection(second, 'route');
  await expect(second.getByTestId('quest-map').getByRole('heading')).toContainText('Grid Planner');
  await expect(second.getByTestId('text-data-disclaimer')).toContainText('your imported CSV');
  await expect(second.getByTestId('alert-storage-conflict')).toHaveCount(0);
  // Clearing must leave only a tombstone, despite edits in the older tab.
  first.once('dialog', dialog => dialog.accept());
  await first.getByTestId('button-clear-profile').click();
  await expect(first.getByTestId('list-current-skills')).toContainText('No skills yet');
  await expect(second.getByTestId('alert-storage-conflict')).toBeVisible();
  await openSection(second, 'recommendations');
  await second.getByTestId('button-scenario-fast').click();
  await expect(second.getByTestId('row-role-role-0')).toContainText('+29%');
  expect(await second.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot, storageKey)).toBeNull();
  // Only an explicit choice may recreate the cleared profile.
  second.once('dialog', dialog => dialog.accept());
  await second.getByTestId('button-keep-tab-profile').click();
  await expect(second.getByTestId('alert-storage-conflict')).toHaveCount(0);
  await expect.poll(() => second.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot?.scenario, storageKey)).toBe('fast');
  await expect(first.getByTestId('alert-storage-conflict')).toBeVisible();
  first.once('dialog', dialog => dialog.accept());
  await first.getByTestId('button-load-saved-profile').click();
  await openSection(first, 'recommendations');
  await expect(first.getByTestId('row-role-role-0')).toContainText('Grid Planner');
  await expect(first.getByTestId('row-role-role-0')).toContainText('+29%');
  await openSection(first, 'route');
  await expect(first.getByTestId('quest-map').getByRole('heading')).toContainText('Grid Planner');
  await expect(first.getByTestId('text-data-disclaimer')).toContainText('your imported CSV');
  await second.close();
});
