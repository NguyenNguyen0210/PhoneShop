import type { Page } from '@playwright/test';
import { sel } from '../../../utils/antd.selectors';

export async function modalConfirm(page: Page) {
  await page.locator(sel.modalOk).click();
}

export async function modalCancel(page: Page) {
  await page.locator(sel.modalCancel).click();
}
