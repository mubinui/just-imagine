import { test, expect } from '@playwright/test';

test('learning games use direct manipulation and reserve Pip a dock position', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('link', { name: 'Learn', exact: true }).click();
  await expect(page.locator('.island.is-open')).toHaveCount(6);
  await page.getByRole('link', { name: /^Hygiene,/ }).click();
  await expect(page.locator('.story-adventure')).toHaveAttribute('data-phase', 'opening');
  await page.locator('.story-primary').click();
  await expect(page.locator('.plaque-patch')).toHaveCount(24);
  const brush = page.getByRole('button', { name: 'Pick up toothbrush', exact: true });
  await brush.focus();
  await page.keyboard.press('Enter');
  while (await page.getByRole('button', { name: 'Brush this patch', exact: true }).count())
    await page.getByRole('button', { name: 'Brush this patch', exact: true }).first().click();
  await expect(page.locator('.story-adventure')).toHaveAttribute('data-phase', 'ending');
  await expect(page.locator('.story-goal')).toBeVisible();
  const helper = page.locator('.learn-dock .companion-dock');
  expect(await helper.evaluate((e) => getComputedStyle(e).position)).toBe('relative');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
