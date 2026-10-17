import { test, expect } from '@playwright/test';

test('saved English/Bangla selection follows parent settings, shared navigation, reload and profile choice', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/parent/settings');
  const form = page.locator('.language-preferences');
  await expect(form).toBeVisible();
  await expect(form.locator('option')).toHaveCount(2);
  await expect(form.locator('option')).toHaveText(['English', 'Bangla (Bangladesh)']);
  await form.locator('select').selectOption('bn');
  await form.locator('button[type=submit]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn-BD');
  await expect(page).toHaveTitle(/জাস্ট ইমাজিন/);
  await expect(page.locator('.brand')).toHaveText('জাস্ট ইমাজিন.');
  await expect(form.locator('h2')).toHaveText('অ্যাপ ও কথা বলার ভাষা');
  await page.reload();
  await expect(form.locator('select')).toHaveValue('bn');
  await page.goto('/learn');
  await expect(page).toHaveTitle(/জাস্ট ইমাজিন/);
  await expect(
    page.getByRole('heading', { name: 'আজ আমরা কোথায় শিখব?', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^লাইভ সহকারী:/ }).click();
  const assistant = page.getByRole('region', { name: 'লাইভ সহকারী', exact: true });
  await expect(assistant.getByRole('heading', { name: /-এর সঙ্গে কথা বলো$/ })).toBeVisible();
  await expect(assistant.getByRole('status')).toHaveText('নমুনা বন্ধু · ছুঁয়ে ঘুরে দেখো');
  await page.keyboard.press('Escape');
  await page.goto('/parent/settings');
  await form.locator('select').selectOption('en');
  await form.locator('button[type=submit]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(form.locator('h2')).toHaveText('App and conversation language');
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});
