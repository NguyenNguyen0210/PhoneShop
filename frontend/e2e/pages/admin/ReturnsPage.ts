import type { Page } from '@playwright/test';
export class AdminReturnsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/returns'); }
}
