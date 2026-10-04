import { Page, expect } from '@playwright/test';
import { sel } from './antd.selectors';

export async function waitForTable(page: Page) {
  await page.locator(sel.table).first().waitFor({ state: 'visible', timeout: 15000 });
}

export async function expectTableHasRows(page: Page) {
  await waitForTable(page);
  await expect(page.locator(sel.tableRow).first()).toBeVisible();
}

export async function expectEmptyState(page: Page) {
  await expect(page.locator(sel.empty).first()).toBeVisible();
}
