import { test as setup, expect } from '@playwright/test';

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'staff@phoneshop.vn';
const STAFF_PASS = process.env.E2E_STAFF_PASS ?? 'Password@123';

setup('staff auth', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('name@example.com').fill(STAFF_EMAIL);
  await page.getByPlaceholder('Nhập mật khẩu').fill(STAFF_PASS);
  const loginResp = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 30000 });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await loginResp.catch(() => null);
  await expect(page).toHaveURL(/\/staff/, { timeout: 30000 });
  await page.context().storageState({ path: './e2e/staff/.auth/staffState.json' });
});
