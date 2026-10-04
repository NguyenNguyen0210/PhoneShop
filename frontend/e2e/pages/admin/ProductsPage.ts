import type { Page } from '@playwright/test';
export class AdminProductsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/products'); }
  async search(kw: string) {
    await this.page.locator('input[placeholder*="Tìm"]').first().fill(kw);
    await this.page.keyboard.press('Enter');
  }
}
