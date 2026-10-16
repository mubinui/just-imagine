import { test, expect } from '@playwright/test';

// Learning Worlds in the local preview (spec 6b, plan I5). The fake gateway plays Saturn: it
// introduces herself, asks her challenge with two tappable options (the preview has no
// microphone), pays 4 points once, and the explorer's 6 earlier points reach the first pet.
test('Learn Map to Space: Saturn comes closer, asks a challenge, pays points and a pet', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/play');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('ji-learn:') || key.startsWith('ji-pet:')) localStorage.removeItem(key);
  });
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await page.getByRole('link', { name: 'Learn', exact: true }).click();

  // The map: six islands, all six destinations open with saved progress.
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { name: 'Where shall we learn today?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Space, 3 of 13 challenges' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Animals, 0 of 10 challenges' })).toBeVisible();
  await expect(page.locator('.island.is-soon')).toHaveCount(0);
  await expect(page.locator('.island.is-open')).toHaveCount(6);
  await expect(page.getByLabel('My points: 6')).toBeVisible();
  await page.screenshot({ path: 'test-results/learn-map-desktop.png' });

  // Space: tap Saturn and she comes closer with her facts.
  await page.getByRole('link', { name: /^Space/ }).click();
  await expect(page).toHaveURL(/\/learn\/space$/);
  await expect(page.locator('.story-adventure')).toHaveAttribute('data-phase', 'opening');
  await page.locator('.story-chapters summary').click();
  await page.locator('[data-chapter-link="saturn"]').click();
  await page.getByRole('button', { name: 'Meet Saturn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saturn', exact: true })).toBeVisible();
  await expect(page.locator('.bubble').first()).toContainText('rings');
  await page.screenshot({ path: 'test-results/learn-closer-desktop.png' });

  // Ask: the voice session opens and hands the call to Saturn, who asks her challenge.
  await page.getByRole('button', { name: 'Ask Saturn' }).click();
  await expect(page.getByRole('button', { name: 'Hang up' })).toBeVisible();
  const sheet = page.getByRole('dialog', { name: /bathtub/ });
  await expect(sheet).toBeVisible();
  await page.screenshot({ path: 'test-results/learn-challenge-desktop.png' });
  await sheet.getByRole('button', { name: 'Float' }).click();

  // Points once, then the first pet.
  await expect(page.getByRole('status').filter({ hasText: '+4 points' })).toBeVisible();
  await expect(page.getByLabel('My points: 10')).toBeVisible();
  const found = page.getByRole('dialog', { name: 'You found Tuktuk!' });
  await expect(found).toBeVisible();
  await page.screenshot({ path: 'test-results/learn-pet-desktop.png' });
  await found.getByRole('button', { name: 'Make Tuktuk my buddy' }).click();
  await expect(page.locator('.learn-dock').getByRole('button', { name: 'Tuktuk' })).toBeVisible();

  // Hang up returns the call to the friend; the shelf shows the buddy.
  await page.getByRole('button', { name: 'Hang up' }).click();
  await expect(page.getByRole('button', { name: 'Ask Saturn' })).toBeVisible();
  await page.getByRole('button', { name: 'My pets' }).click();
  const shelf = page.getByRole('dialog', { name: 'My pets' });
  await expect(shelf.getByRole('button', { name: /Tuktuk/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(shelf).toContainText('At 25 points');
  await shelf.getByRole('button', { name: 'Close' }).click();

  // Progress persists on the map.
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Space, 4 of 13 challenges' })).toBeVisible();

  // Phones: no horizontal overflow on the map or a section.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/learn', '/learn/animals']) {
    await page.goto(route);
    await expect(page.locator('.learn-stage')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/learn-mobile-${route.split('/').pop()}.png`,
    });
  }
  expect(errors).toEqual([]);
});
