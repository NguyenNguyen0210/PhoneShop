import type { Page } from '@playwright/test';
export class AdminCustomer360Page {
  constructor(private page: Page) {}
  async goto(id: string) { await this.page.goto(`/admin/customers/${id}`); }
}
