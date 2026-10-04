import type { Page } from '@playwright/test';
export class AdminInventoryPage {
  constructor(private page: Page) {}
  async goto(tab: 'stock' | 'imei' | 'ledger' = 'stock') {
    await this.page.goto(`/admin/inventory?tab=${tab}`);
  }
}
