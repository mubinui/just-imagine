import { expect, type Page } from '@playwright/test';

// The "Catch the Flies" world carries a generated game script (Game API v1).
// Fly homes in metres on the 16 x 9 stage; the script keeps each fly hovering near its home.
const FLY_HOMES = [
  { x: 4.5, y: 2.6 },
  { x: 7.5, y: 3.6 },
  { x: 10.5, y: 2.4 },
  { x: 6, y: 5.2 },
  { x: 9.5, y: 5.6 },
];

/** Taps the fly homes until the HUD's score leaves zero. */
export async function catchAFly(page: Page) {
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
}
