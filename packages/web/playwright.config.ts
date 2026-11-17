import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

const inCi = process.env['CI'] === 'true';
// Lets a machine with a preinstalled Chromium use it instead of downloading one.
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];

/** Chromium everywhere; Firefox and WebKit too in CI or with ALL_BROWSERS=1 (Release 1's cross-browser pass). */
function browsers(): { name: string; use: NonNullable<PlaywrightTestConfig['use']> }[] {
  const chromium = {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      // The full Chromium in headless mode, not Playwright's stripped headless shell: it is the browser
      // people use, and it draws the frames the same way on every run (decision 184).
      ...(executablePath === undefined ? { channel: 'chromium' } : { launchOptions: { executablePath } }),
    },
  };
  if (!inCi && process.env['ALL_BROWSERS'] !== '1') return [chromium];
  return [chromium, { name: 'firefox', use: { ...devices['Desktop Firefox'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } }];
}

/**
 * Every test starts with the fullscreen tip already dismissed, so the idle screen is the one the earlier frames
 * draw; the tip's own tests start without it (e2e/notices.spec.ts).
 */
export const TIP_DISMISSED = { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'notices', value: '{"schema":1,"dismissed":["fullscreen"]}' }] }] };

export default defineConfig({
  testDir: './e2e',
  forbidOnly: inCi,
  retries: 0,
  reporter: inCi ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    // The service worker would answer requests out of reach of page.route; offline tests turn it on.
    serviceWorkers: 'block',
    storageState: TIP_DISMISSED,
  },
  // Each browser runs the suite, then its timing tests alone (one worker, after everything else in that
  // browser has finished), so nothing competes with them for the processor (e2e/timing.spec.ts).
  projects: browsers().flatMap(({ name, use }) => [
    { name, use, testIgnore: /timing\.spec\.ts$/ },
    { name: `${name}-timing`, use, testMatch: /timing\.spec\.ts$/, workers: 1, dependencies: [name] },
  ]),
  // Production build behind `vite preview`, which sends the same headers as Cloudflare.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
