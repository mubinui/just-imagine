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
    // Friends open from the stacked faces beside the talk portrait.
    await page.getByRole('button', { name: 'Choose a friend', exact: true }).click();
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
    await page.getByRole('button', { name: 'More', exact: true }).click();
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
    await expect(page.locator('.studio-dock').getByRole('link')).toHaveCount(0);
    await page.getByRole('button', { name: 'Exit Studio', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A lovely place to pause.' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('On a short phone the Studio dock sits at the bottom of the screen', async ({ page }) => {
  // Phone Safari leaves well under 700 CSS px once its toolbars show. When the stage content is
  // shorter than that (the "Tap a friend to start" invitation before any world), the dock must
  // still end at the bottom edge instead of stopping halfway up with empty stage below it; when
  // the content is taller (a world with its controls), the dock is the last thing to scroll to.
  const dockEnd = () =>
    page.locator('.studio-stage').evaluate((stage) => {
      const dockBox = stage.querySelector('.studio-dock')!.getBoundingClientRect();
      return {
        dockEnd: dockBox.bottom + stage.scrollTop,
        stageEnd: Math.max(stage.scrollHeight, stage.clientHeight),
        viewport: stage.clientHeight,
      };
    });
  for (const viewport of [
    { width: 390, height: 664 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/play');
    await page.evaluate(() => sessionStorage.removeItem('ji-fixture'));
    await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
    await expect(page.locator('.studio-dock')).toBeVisible();
    // A world taller than the screen: the dock ends the scroll.
    const tall = await dockEnd();
    expect(Math.abs(tall.dockEnd - tall.stageEnd)).toBeLessThanOrEqual(1);
    // Content shorter than the screen (sample mode always opens a world, so shorten the scene
    // to the invitation's size): the dock sits on the bottom edge.
    await page.locator('.stage-scene').evaluate((scene) => {
      for (const child of Array.from(scene.children)) (child as HTMLElement).style.display = 'none';
      const stand = document.createElement('div');
      stand.style.height = '320px';
      scene.append(stand);
    });
    const short = await dockEnd();
    expect(short.stageEnd).toBe(short.viewport);
    expect(Math.abs(short.dockEnd - short.viewport)).toBeLessThanOrEqual(1);
  }
});
