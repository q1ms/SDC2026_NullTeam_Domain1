# Frontend regression tests

These tests exercise the current skills-first wizard, role shortlist, gaps,
SDGs and quest in Chromium, including touch, keyboard and downloaded file
contents. They also cover device persistence, invalid saved data, CSV replacement,
and confirmed profile clearing. They use the checked-in CSV and a small
positive-only import fixture.
Each test gets a new browser context; no saved user data is changed.

## Run in Replit

Start the existing **artifacts/workforce-ai: web** workflow, then run:

```sh
pnpm --filter @workspace/workforce-ai test:e2e
```

No API workflow, database, AI key or OpenRouter connection is required.
All `/api/*` requests are intercepted: health is stubbed, other API requests fail
the test. External requests are blocked (optional Google font requests are
ignored). Uncaught frontend errors also fail each test.

Useful checks:

```sh
pnpm --filter @workspace/workforce-ai test:unit
pnpm --filter @workspace/workforce-ai test:e2e:types
pnpm --filter @workspace/workforce-ai test  # unit + browser regressions
pnpm --filter @workspace/workforce-ai test:e2e --project=mobile-chromium
```

## Other machines / CI

Install Chromium once with
`pnpm --filter @workspace/workforce-ai exec playwright install chromium`.
Run the app using its normal hosting setup and set `PLAYWRIGHT_BASE_URL` to the
dashboard URL **including its base path**, e.g.
`http://localhost:80/workforce-ai/`. The default is that URL. Tests deliberately
do not start duplicate servers. Replit's system Chromium is detected
automatically; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can override it.

Both desktop and mobile projects run by default, with retries disabled.
Failure screenshots and traces go under the ignored root
`generated-artifacts/workforce-ai/test-results/` directory. Open a trace with
`pnpm --filter @workspace/workforce-ai exec playwright show-trace <trace.zip>`.
