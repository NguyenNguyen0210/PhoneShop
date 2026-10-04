import type { Page } from '@playwright/test';

export async function uploadSingleFile(page: Page, labelPattern: RegExp, filePath: string) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  void labelPattern;
}
