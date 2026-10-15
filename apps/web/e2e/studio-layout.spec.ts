import { test, expect } from '@playwright/test';

test('Studio preserves canvas proportions and usable controls across viewport sizes', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/play');
    await page.evaluate(() => sessionStorage.removeItem('ji-fixture'));
    await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
    await page.getByRole('button', { name: 'bounce', exact: true }).click();
    const gravity = page.getByLabel('gravity', { exact: true });
    await gravity.selectOption('moon');
    await expect(gravity).toHaveValue('moon');
    const world = await page.locator('.stage-world').boundingBox();
    const canvas = await page.locator('.engine-host canvas').boundingBox();
    expect(world).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(Math.abs(world!.width / world!.height - 16 / 9)).toBeLessThan(0.01);
    expect(Math.abs(canvas!.height - world!.height)).toBeLessThan(1);
    expect(world!.x).toBeGreaterThanOrEqual(0);
    expect(world!.x + world!.width).toBeLessThanOrEqual(viewport.width);
    const stage = await page.locator('.stage').boundingBox();
    expect(stage!.width).toBe(viewport.width);
    expect(stage!.x).toBe(0);
    const names = ['Mishti', 'Bhombol', 'Chandni', 'Pori Apu', 'Onko Mama', 'Jadu Kaka'];
    for (const name of names) {
      const friend = page.getByRole('button', { name, exact: true });
      await friend.click();
      await expect(friend).toHaveAttribute('aria-pressed', 'true');
      await expect(friend.locator('.name')).toBeVisible();
      const bounds = await friend.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'Cannon and Cup', exact: true }).click();
    await page.getByRole('button', { name: 'higher', exact: true }).click();
    const slider = page.getByRole('slider').first();
    await slider.focus();
    await slider.press('End');
    await expect(slider).toHaveValue((await slider.getAttribute('max'))!);
    const displayed = page.locator('.variable').first().locator('output');
    await expect(displayed).toContainText((await slider.getAttribute('max'))!);
    await page.getByRole('button', { name: 'Enter a number' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Finish playing' }).click();
    await expect(page.getByRole('heading', { name: 'A lovely place to pause.' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
