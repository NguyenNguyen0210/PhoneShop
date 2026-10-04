import type { Page } from '@playwright/test';
export class AdminTicketsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/tickets'); }
}
