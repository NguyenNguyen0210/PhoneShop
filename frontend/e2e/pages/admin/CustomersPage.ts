import type { Page } from '@playwright/test';
export class AdminCustomersPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/customers'); }
}
