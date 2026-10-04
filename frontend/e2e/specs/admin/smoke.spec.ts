import { test, expect } from '@playwright/test';

test('storefront home loads', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/PhoneShop|MobileCommerce|Vite|React/i);
});

test('unauthenticated admin redirects to login', async ({ page }) => {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/login/);
});
