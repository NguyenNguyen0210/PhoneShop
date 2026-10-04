import type { Page } from '@playwright/test';
export class AdminSuppliersPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/suppliers'); }
}
