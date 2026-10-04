import type { Page } from '@playwright/test';
import { sel } from '../../utils/antd.selectors';

export async function toolbarSearch(page: Page, keyword: string) {
  await page.locator(sel.searchInput).first().fill(keyword);
  await page.keyboard.press('Enter');
}

export async function gotoInventoryTab(page: Page, tab: 'stock' | 'imei' | 'ledger') {
  await page.goto(`/admin/inventory?tab=${tab}`);
}
