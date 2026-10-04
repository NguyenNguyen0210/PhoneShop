import type { Page } from '@playwright/test';
export class AdminPaymentsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/payments'); }
}
