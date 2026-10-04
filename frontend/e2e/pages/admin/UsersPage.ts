import type { Page } from '@playwright/test';
export class AdminUsersPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/users'); }
}
