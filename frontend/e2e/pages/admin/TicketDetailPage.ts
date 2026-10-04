import type { Page } from '@playwright/test';
export class AdminTicketDetailPage {
  constructor(private page: Page) {}
  async goto(id: string) { await this.page.goto(`/admin/tickets/${id}`); }
}
