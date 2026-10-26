import { test, expect } from '@playwright/test';
import { catchAFly } from './catch-the-flies';

// The preview "Catch the Flies" world carries a generated game script (Game API v1).
test('plays the generated fixture game: answer its question, tap a fly, the score changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Catch the Flies', exact: true }).click();

  const ask = page.getByRole('dialog', { name: 'How many flies can you catch?' });
  await expect(ask).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.game-score-value')).toHaveText('0');
  await expect(page.locator('.game-timer')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/generated-game-ask.png' });
  await ask.getByRole('button', { name: 'Five' }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.locator('.game-chip-label')).toHaveText('Catch 5 flies');

  await catchAFly(page);
  expect(errors).toEqual([]);
  // Game time runs: the script's one-second timer counts down on the HUD. Game time follows
  // the engine's frames (at most 0.1 s per frame), so a slow software renderer needs slack.
  await expect(page.locator('.game-timer')).not.toContainText('0:45', { timeout: 15000 });
  await page.screenshot({ path: 'test-results/generated-game-score.png' });
  await expect(page.getByRole('dialog', { name: 'The game got tangled' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Exit Studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A lovely place to pause.' })).toBeVisible();
  // The game's interval must stop before it can read the disposed simulation.
  await page.waitForTimeout(150);
  expect(errors).toEqual([]);
});
