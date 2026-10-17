import { test, expect } from '@playwright/test';

test('each preview world has a repeatable action backed by the real simulation', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await page.getByRole('button', { name: 'Bounce dragon', exact: true }).click();
  // Other worlds live in the Studio's More menu.
  const choose = async (name: string) => {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator('.prediction-card .actions button').first().click();
  };
  await choose('Bouncy Ball on the Moon');
  await page.getByLabel('gravity', { exact: true }).selectOption('earth');
  await page.getByRole('button', { name: 'Drop them together', exact: true }).click();
  await expect(page.locator('.play-reading')).toHaveText('Gravity 9.81 m/s²');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByLabel('gravity', { exact: true })).toHaveValue('earth');
  await choose('Duck and Stone at the Pond');
  await page.getByLabel('heroMaterial', { exact: true }).selectOption('stone');
  await page.getByRole('button', { name: 'Drop into the pond', exact: true }).click();
  await expect(page.getByLabel('heroMaterial', { exact: true })).toHaveValue('stone');
  await choose('Cannon and Cup');
  await page.getByRole('button', { name: 'Launch ball', exact: true }).click();
  await expect
    .poll(async () => Number.parseFloat((await page.locator('.play-reading').textContent())!))
    .toBeGreaterThan(0.2);
  await choose('Peg Garden Probability');
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Drop a ball', exact: true }).click();
  await expect
    .poll(async () => Number.parseInt((await page.locator('.play-reading').textContent())!), {
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(2);
  await choose('Share and Recombine');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Split into halves', exact: true }).click();
    await expect(page.locator('.play-reading')).toHaveText('2 equal halves');
    await expect(
      page.getByRole('button', { name: 'Split into halves', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Join the halves', exact: true }).click();
    await expect(page.locator('.play-reading')).toHaveText('1 whole');
  }
  expect(errors).toEqual([]);
});
