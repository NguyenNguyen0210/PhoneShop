import type { Page } from '@playwright/test';
export class AdminDashboardPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin'); }
}
