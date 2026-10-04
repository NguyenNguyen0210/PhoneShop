import type { Page } from '@playwright/test';
export class AdminPromotionsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/promotions'); }
}
