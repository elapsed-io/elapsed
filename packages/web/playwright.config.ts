import { defineConfig, devices } from '@playwright/test';

const inCi = process.env['CI'] === 'true';
// Lets a machine with a preinstalled Chromium use it instead of downloading one.
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];

export default defineConfig({
  testDir: './e2e',
  forbidOnly: inCi,
  retries: 0,
  reporter: inCi ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
      },
    },
  ],
  // Production build behind `vite preview`, which sends the same headers as Cloudflare.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
