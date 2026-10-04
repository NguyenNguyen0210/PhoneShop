import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30 * 1000,
  fullyParallel: false,
  workers: 3,
  retries: 2,
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: undefined,
});
