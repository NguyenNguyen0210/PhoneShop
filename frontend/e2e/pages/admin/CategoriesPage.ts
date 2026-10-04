import type { Page } from '@playwright/test';
export class AdminCategoriesPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/categories'); }
}
