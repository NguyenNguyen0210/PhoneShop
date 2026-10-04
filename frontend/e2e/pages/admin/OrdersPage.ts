import type { Page } from '@playwright/test';
export class AdminOrdersPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/orders'); }
  async gotoDetail(id: string) { await this.page.goto(`/admin/orders/${id}`); }
}
