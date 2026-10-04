import type { Page } from '@playwright/test';
export class AdminBrandsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/brands'); }
}
