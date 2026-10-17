import { test, expect, type Page } from '@playwright/test';

// One test per preview world: each world runs a live simulation, so on a small CI runner a single
// walk through all five worlds sat right at the time limit. Separate tests keep each world's budget
// and name the world that breaks.
const errors = new WeakMap<Page, string[]>();
// Clicks wait on a live simulation; on a two-core runner six peg drops alone take about 20 s.
test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  const seen: string[] = [];
  errors.set(page, seen);
  page.on('pageerror', (error) => seen.push(error.message));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await page.getByRole('button', { name: 'Bounce dragon', exact: true }).click();
});

test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

// Other worlds live in the Studio's More menu.
async function choose(page: Page, name: string) {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
  await page.locator('.prediction-card .actions button').first().click();
}

test('the moon world drops both balls under the chosen gravity and keeps it on retry', async ({
  page,
}) => {
  await choose(page, 'Bouncy Ball on the Moon');
  await page.getByLabel('gravity', { exact: true }).selectOption('earth');
  await page.getByRole('button', { name: 'Drop them together', exact: true }).click();
  await expect(page.locator('.play-reading')).toHaveText('Gravity 9.81 m/s²');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByLabel('gravity', { exact: true })).toHaveValue('earth');
});

test('the pond world keeps the chosen material through a drop', async ({ page }) => {
  await choose(page, 'Duck and Stone at the Pond');
  await page.getByLabel('heroMaterial', { exact: true }).selectOption('stone');
  await page.getByRole('button', { name: 'Drop into the pond', exact: true }).click();
  await expect(page.getByLabel('heroMaterial', { exact: true })).toHaveValue('stone');
});

test('the cannon world launches a ball that travels', async ({ page }) => {
  await choose(page, 'Cannon and Cup');
  await page.getByRole('button', { name: 'Launch ball', exact: true }).click();
  await expect
    .poll(async () => Number.parseFloat((await page.locator('.play-reading').textContent())!))
    .toBeGreaterThan(0.2);
});

test('the peg garden counts balls as they land', async ({ page }) => {
  await choose(page, 'Peg Garden Probability');
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Drop a ball', exact: true }).click();
  await expect
    .poll(async () => Number.parseInt((await page.locator('.play-reading').textContent())!), {
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(2);
});

test('the fractions world splits and rejoins repeatedly', async ({ page }) => {
  await choose(page, 'Share and Recombine');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Split into halves', exact: true }).click();
    await expect(page.locator('.play-reading')).toHaveText('2 equal halves');
    await expect(
      page.getByRole('button', { name: 'Split into halves', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Join the halves', exact: true }).click();
    await expect(page.locator('.play-reading')).toHaveText('1 whole');
  }
});
