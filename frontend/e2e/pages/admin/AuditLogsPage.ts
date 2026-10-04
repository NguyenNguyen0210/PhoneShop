import type { Page } from '@playwright/test';
export class AdminAuditLogsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/audit-logs'); }
}
