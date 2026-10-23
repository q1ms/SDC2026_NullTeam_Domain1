# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> refresh retains the complete imported journey and CSV replacement discards old identities
- Location: e2e/dashboard.spec.ts:214:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('row-role-role-1')
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('row-role-role-1') with timeout 5000ms
  - waiting for getByTestId('row-role-role-1')
    14 × locator resolved to <button role="tab" type="button" tabindex="-1" id="role-tab-1" class="jr-role " aria-selected="false" data-component-name="button" aria-controls="role-details" data-testid="row-role-role-1" data-replit-metadata="artifacts/workforce-ai/src/components/role-picker.tsx:25:12">…</button>
       - unexpected value "false"

```

```yaml
- tab "#2 / Education Community Educator Fit 62% / +11% outlook"
```

# Test source

```ts
  121 | test('sidebar navigation and role tabs work with keyboard input', async ({ dashboard: page }) => {
  122 |   await importPositiveCsv(page);
  123 |   const first = page.getByTestId('row-role-role-0');
  124 |   const second = page.getByTestId('row-role-role-1');
  125 |   const panel = page.getByRole('tabpanel');
  126 | 
  127 |   await expect(page.getByRole('tablist', { name: 'Recommended roles' }).getByRole('tab')).toHaveCount(2);
  128 |   await first.focus();
  129 |   await page.keyboard.press('ArrowRight');
  130 |   await expect(second).toBeFocused();
  131 |   await expect(second).toHaveAttribute('aria-selected', 'true');
  132 |   await expect(first).toHaveAttribute('aria-selected', 'false');
  133 |   await expect(panel).toHaveAttribute('aria-labelledby', 'role-tab-1');
  134 |   await expect(panel).toContainText('Community Educator');
  135 |   await expect(page.getByTestId('quest-map')).toHaveCount(0);
  136 |   await expect(page.getByTestId('panel-skills-gap')).toHaveCount(0);
  137 | 
  138 |   await openSection(page, 'route');
  139 |   await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  140 |   await expect(page.getByTestId('section-recommendations')).toHaveCount(0);
  141 |   await openSection(page, 'skills-sdgs');
  142 |   await expect(page.getByTestId('panel-skills-gap')).toBeVisible();
  143 |   await expect(page.getByTestId('quest-map')).toHaveCount(0);
  144 |   await expect(page.getByTestId('link-section-skills-sdgs')).toHaveAttribute('aria-current', 'page');
  145 | });
  146 | 
  147 | test('sidebar collapses to centered icons and each view stays focused', async ({ dashboard: page }) => {
  148 |   await importPositiveCsv(page);
  149 |   const nav = page.getByRole('navigation', { name: 'Career plan sections' });
  150 |   const toggle = page.getByTestId('button-toggle-sidebar');
  151 | 
  152 |   await expect(page.locator('.jr-brand')).toHaveText('jAIX');
  153 |   await expect(page.locator('.jr-bar').getByTestId('button-scenario-fast')).toHaveCount(0);
  154 |   await expect(page.getByTestId('section-recommendations')).toBeVisible();
  155 |   await expect(page.getByTestId('section-overview')).toHaveCount(0);
  156 |   await toggle.click();
  157 |   await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  158 |   await expect(nav).toHaveAttribute('data-collapsed', 'true');
  159 |   await expect(page.getByTestId('link-section-overview')).toHaveCSS('justify-content', 'center');
  160 |   await expect(page.getByTestId('link-section-overview').locator('.jr-nav-text')).toHaveCSS('max-width', '0px');
  161 | 
  162 |   await openSection(page, 'overview');
  163 |   await expect(page.getByTestId('section-overview')).toBeVisible();
  164 |   await expect(page.getByTestId('section-recommendations')).toHaveCount(0);
  165 |   await openSection(page, 'recommendations');
  166 |   await expect(page.getByTestId('section-recommendations')).toBeVisible();
  167 |   await expect(page.getByTestId('section-overview')).toHaveCount(0);
  168 |   await toggle.click();
  169 |   await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  170 |   await openSection(page, 'route');
  171 |   await expect(page.getByTestId('quest-map')).toBeVisible();
  172 |   await expect(page.getByTestId('panel-skills-gap')).toHaveCount(0);
  173 | });
  174 | 
  175 | test('light background follows the pointer and dashboard surfaces stay readable', async ({ dashboard: page }) => {
  176 |   await importPositiveCsv(page);
  177 |   await page.emulateMedia({ reducedMotion: 'no-preference' });
  178 |   const background = page.locator('.jr-bg');
  179 |   const sidebar = page.locator('.jr-sidebar');
  180 |   const sidebarStyle = await sidebar.evaluate((node) => {
  181 |     const style = getComputedStyle(node);
  182 |     return { left: node.getBoundingClientRect().left, background: style.backgroundColor };
  183 |   });
  184 |   expect(sidebarStyle.left).toBeLessThan(40);
  185 |   expect(sidebarStyle.background).toBe('rgba(255, 255, 255, 0.42)');
  186 | 
  187 |   const contentBounds = await page.locator('.jr-results-content').evaluate((node) => {
  188 |     const { left, right } = node.getBoundingClientRect();
  189 |     return { left, right, viewportWidth: window.innerWidth };
  190 |   });
  191 |   expect(contentBounds.left).toBeGreaterThan(sidebarStyle.left);
  192 |   expect(Math.abs(contentBounds.right - (contentBounds.viewportWidth - 20))).toBeLessThan(3);
  193 | 
  194 |   const backgroundImage = page.locator('.jr-bg-image');
  195 |   const movingBox = page.locator('.jr-bg-float');
  196 |   const imageTransform = await backgroundImage.evaluate((node) => getComputedStyle(node).transform);
  197 |   const viewport = page.viewportSize();
  198 |   await page.mouse.move((viewport?.width ?? 1280) - 80, (viewport?.height ?? 800) - 80);
  199 |   await expect.poll(() => background.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-x')))).toBeGreaterThan(20);
  200 |   const initialBoxTransform = await movingBox.evaluate((node) => getComputedStyle(node).transform);
  201 |   await page.mouse.move(140, 180);
  202 |   await expect.poll(() => background.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-x')))).toBeLessThan(-25);
  203 |   expect(await backgroundImage.evaluate((node) => getComputedStyle(node).transform)).toBe(imageTransform);
  204 |   expect(await movingBox.evaluate((node) => getComputedStyle(node).transform)).not.toBe(initialBoxTransform);
  205 | 
  206 |   const surface = await page.getByTestId('section-recommendations').locator('.jr-recommendations').evaluate((node) => {
  207 |     const style = getComputedStyle(node);
  208 |     return { color: style.color, background: style.backgroundColor };
  209 |   });
  210 |   expect(surface.color).toBe('rgb(23, 32, 51)');
  211 |   expect(surface.background).toBe('rgba(255, 255, 255, 0.3)');
  212 | });
  213 | 
  214 | test('refresh retains the complete imported journey and CSV replacement discards old identities', async ({ dashboard: page }) => {
  215 |   await importPositiveCsv(page);
  216 |   await page.getByTestId('button-scenario-fast').click();
  217 |   await page.getByTestId('row-role-role-1').click();
  218 |   await expect(page.getByTestId('status-device-storage')).toContainText('Saved on this device');
  219 |   await page.reload();
  220 |   await expect(page.getByTestId('button-scenario-fast')).toHaveAttribute('aria-pressed', 'true');
> 221 |   await expect(page.getByTestId('row-role-role-1')).toHaveAttribute('aria-selected', 'true');
      |                                                     ^ Error: expect(locator).toHaveAttribute(expected) failed
  222 |   await expect(page.getByTestId('row-role-role-1')).toContainText('+11%');
  223 |   await openSection(page, 'route');
  224 |   await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Community Educator');
  225 |   await expect(page.getByTestId('quest-step-current')).toContainText('Excel');
  226 |   await page.getByTestId('input-role-csv').setInputFiles({
  227 |     name: 'replacement.csv', mimeType: 'text/csv',
  228 |     buffer: Buffer.from(positiveCsv.replace('Solar Planner', 'Grid Planner').replace('Community Educator', 'Learning Coach')),
  229 |   });
  230 |   await openSection(page, 'recommendations');
  231 |   await expect(page.getByTestId('row-role-role-0')).toContainText('Grid Planner');
  232 |   await expect(page.getByTestId('row-role-role-0')).toHaveAttribute('aria-selected', 'true');
  233 |   await page.reload();
  234 |   await expect(page.getByTestId('row-role-role-0')).toContainText('Grid Planner');
  235 |   await openSection(page, 'route');
  236 |   await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Grid Planner');
  237 |   await expect(page.getByTestId('text-data-disclaimer')).toContainText('your imported CSV');
  238 |   await expect(page.getByText('Community Educator', { exact: true })).toHaveCount(0);
  239 | });
  240 | 
  241 | test('built-in selection survives refresh and confirmed clearing removes only this profile', async ({ dashboard: page }) => {
  242 |   await page.getByTestId('button-scenario-fast').click();
  243 |   const row = page.locator('[data-testid^="row-role-"]').nth(1);
  244 |   const id = await row.getAttribute('data-testid');
  245 |   await row.click();
  246 |   const title = await row.locator('b').innerText();
  247 |   await page.reload();
  248 |   await expect(page.getByTestId(id!)).toHaveAttribute('aria-selected', 'true');
  249 |   await openSection(page, 'route');
  250 |   await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText(title);
  251 |   await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  252 |   page.once('dialog', dialog => dialog.dismiss());
  253 |   await page.getByTestId('button-clear-profile').click();
  254 |   await expect(page.getByTestId('panel-journey-results')).toBeVisible();
  255 |   page.once('dialog', dialog => dialog.accept());
  256 |   await page.getByTestId('button-clear-profile').click();
  257 |   await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  258 |   await page.reload();
  259 |   await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  260 |   await expect(page.getByTestId('text-data-disclaimer')).toContainText('illustrative');
  261 |   expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot, storageKey)).toBeNull();
  262 |   expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  263 | });
  264 | 
  265 | test('malformed and unsupported saved profiles recover with a notice', async ({ dashboard: page }) => {
  266 |   for (const raw of ['{', '{"version":2}', '{"version":1,"skills":false}']) {
  267 |     await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: storageKey, raw });
  268 |     await page.reload();
  269 |     await expect(page.getByTestId('text-storage-notice')).toContainText('invalid or from an unsupported version');
  270 |     await expect(page.getByTestId('list-current-skills')).toContainText('No skills yet');
  271 |     await expect(page.getByTestId('button-start-journey')).toBeDisabled();
  272 |   }
  273 | });
  274 | 
  275 | test('Fast keeps an all-declining dataset honestly empty and Moderate restores its role', async ({ dashboard: page }) => {
  276 |   await page.getByTestId('input-role-csv').setInputFiles({
  277 |     name: 'declining.csv', mimeType: 'text/csv',
  278 |     buffer: Buffer.from([
  279 |       'role,sector,moderate_growth_pct,fast_growth_pct,moderate_resilience,fast_resilience,skills,sdgs',
  280 |       'Records Clerk,Admin,-3,-20,45,20,Excel|documentation,SDG 8',
  281 |     ].join('\n')),
  282 |   });
  283 |   await expect(page.getByTestId('row-role-role-0')).toContainText('Records Clerk');
  284 |   await page.getByTestId('button-scenario-fast').click();
  285 |   await expect(page.getByTestId('text-no-recommendations')).toContainText('no non-declining roles');
  286 |   await expect(page.getByTestId('quest-map')).toHaveCount(0);
  287 |   await page.reload();
  288 |   await expect(page.getByTestId('text-no-recommendations')).toBeVisible();
  289 |   await page.getByRole('button', { name: 'Switch to Moderate' }).click();
  290 |   await expect(page.getByTestId('row-role-role-0')).toContainText('-3%');
  291 |   await openSection(page, 'route');
  292 |   await expect(page.getByTestId('quest-map').getByRole('heading')).toContainText('Records Clerk');
  293 | });
  294 | 
  295 | test('two tabs preserve active edits through CSV replacement and clearing until explicitly resolved', async ({ dashboard: first, context, baseURL }) => {
  296 |   await importPositiveCsv(first);
  297 |   await first.getByTestId('row-role-role-1').click();
  298 |   const second = await context.newPage();
  299 |   await second.goto(baseURL!);
  300 |   await expect(second.getByTestId('row-role-role-1')).toHaveAttribute('aria-selected', 'true');
  301 |   await expect(first.getByTestId('alert-storage-conflict')).toHaveCount(0);
  302 |   await second.getByTestId('button-edit-skills').click();
  303 |   await second.getByTestId('input-add-skill').fill('Unfinished skill');
  304 |   await expect(first.getByTestId('alert-storage-conflict')).toBeVisible();
  305 |   // Explicitly keep the first tab, then replace its CSV with colliding row IDs.
  306 |   first.once('dialog', dialog => dialog.accept());
  307 |   await first.getByTestId('button-keep-tab-profile').click();
  308 |   await first.getByTestId('input-role-csv').setInputFiles({
  309 |     name: 'replacement.csv', mimeType: 'text/csv',
  310 |     buffer: Buffer.from(positiveCsv.replace('Solar Planner', 'Grid Planner').replace('Community Educator', 'Learning Coach').replace(',19,', ',29,')),
  311 |   });
  312 |   await expect(second.getByTestId('alert-storage-conflict')).toBeVisible();
  313 |   await expect(second.getByTestId('input-add-skill')).toHaveValue('Unfinished skill');
  314 |   await second.getByTestId('button-add-skill').click();
  315 |   await expect(second.getByTestId('list-current-skills')).toContainText('Unfinished skill');
  316 |   expect(await first.evaluate((key) => JSON.parse(localStorage.getItem(key)!).snapshot.dataset.roles[0].title, storageKey)).toBe('Grid Planner');
  317 |   // Dismissing a resolution must leave both the local edits and conflict intact.
  318 |   second.once('dialog', dialog => dialog.dismiss());
  319 |   await second.getByTestId('button-load-saved-profile').click();
  320 |   await expect(second.getByTestId('list-current-skills')).toContainText('Unfinished skill');
  321 |   second.once('dialog', dialog => dialog.accept());
```