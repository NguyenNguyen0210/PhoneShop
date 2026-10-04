import type { Page } from '@playwright/test';
export class AdminInstallmentsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/installments'); }
}
