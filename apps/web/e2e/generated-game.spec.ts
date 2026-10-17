import { test, expect } from '@playwright/test';

// The preview "Catch the Flies" world carries a generated game script (Game API v1).
// Fly homes in metres on the 16 x 9 stage; the script keeps each fly hovering near its home.
const FLY_HOMES = [
  { x: 4.5, y: 2.6 },
  { x: 7.5, y: 3.6 },
  { x: 10.5, y: 2.4 },
  { x: 6, y: 5.2 },
  { x: 9.5, y: 5.6 },
];

test('plays the generated fixture game: answer its question, tap a fly, the score changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(page.locator('canvas')).toBeVisible();
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

  const canvas = page.locator('.stage-world canvas');
  const box = (await canvas.boundingBox())!;
  const score = page.locator('.game-score-value');
  // Stop at the first catch: the HUD renders a catch a frame later, and clicking on past it can
  // catch all five flies inside the first second, which ends the game before its timer ticks.
  let caught = false;
  for (let round = 0; round < 12 && !caught; round++) {
    for (const home of FLY_HOMES) {
      await page.mouse.click(box.x + (home.x / 16) * box.width, box.y + (home.y / 9) * box.height);
      caught = await expect(score)
        .not.toHaveText('0', { timeout: 250 })
        .then(
          () => true,
          () => false,
        );
      if (caught) break;
    }
  }
  await expect(score).not.toHaveText('0');
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
