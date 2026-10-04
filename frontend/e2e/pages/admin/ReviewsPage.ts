import type { Page } from '@playwright/test';
export class AdminReviewsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/admin/reviews'); }
}
