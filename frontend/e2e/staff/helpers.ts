import { expect, type Page } from '@playwright/test';

export async function gotoStaff(page: Page, path = '/staff') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function expectNoAdminLinks(page: Page) {
  const forbidden = [
    'Quản lý Người dùng',
    'Nhật ký Hoạt động',
    'Cấu hình Hệ thống',
    'Khuyến mãi & Flash Sale',
    'Nhà cung cấp',
  ];
  for (const t of forbidden) {
    await expect(page.getByText(t, { exact: false })).toHaveCount(0);
  }
}

export async function searchAndAssert(page: Page, placeholder: string, query: string) {
  const input = page.getByPlaceholder(new RegExp(placeholder, 'i'));
  await input.fill(query);
  await page.waitForLoadState('networkidle');
}
