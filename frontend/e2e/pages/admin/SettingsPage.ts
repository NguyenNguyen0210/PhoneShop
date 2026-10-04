import type { Page } from '@playwright/test';
export class AdminSettingsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/settings'); }
}
