import { expect, type Page } from '@playwright/test';

/** Opens a parent page in the sample preview, signing in again at the grown-ups' lock. */
export async function openParentSpace(page: Page, path: string) {
  await page.goto(path);
  await page.locator('.parent-gate form button').click();
  await expect(page.locator('.parent-shell')).toBeVisible();
}
