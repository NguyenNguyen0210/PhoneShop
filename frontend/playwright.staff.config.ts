import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/staff',
  fullyParallel: false,
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  retries: 2,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'staff-setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/staff/.auth/staffState.json',
      },
      dependencies: ['staff-setup'],
    },
  ],
});
