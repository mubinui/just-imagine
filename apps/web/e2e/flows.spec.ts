import { test, expect } from '@playwright/test';
import { openParentSpace } from './parent-space';
test('profile gesture unlocks audio, world renders, prediction and lab controls work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('.stage-status')).toContainText('Voice off');
  await page
    .getByRole('button', { name: /^Talk to / })
    .first()
    .click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  await expect(page.locator('.stage-status')).toContainText('Listening');
  await expect(page.getByRole('button', { name: 'bounce', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await expect(page.getByRole('button', { name: 'bounce', exact: true })).toHaveCount(0);
  await page.getByLabel('gravity', { exact: true }).selectOption('moon');
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Cannon and Cup', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lab tools' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter a number' }).first().click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: '9', exact: true }).click();
  await page.getByRole('button', { name: '9', exact: true }).click();
  await page.getByRole('button', { name: 'Apply number' }).click();
  const slider = page.getByRole('slider').first();
  await expect(slider).toHaveValue((await slider.getAttribute('max')) || '');
  await page.getByRole('button', { name: 'Exit Studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A lovely place to pause.' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('parent CRUD persists and deletion requires confirmation', async ({ page }) => {
  await openParentSpace(page, '/parent/children');
  await page.getByLabel('First name').last().fill('Mira');
  await page.getByRole('button', { name: 'Add explorer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mira', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mira', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mira', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('heading', { name: 'Mira', exact: true })).toHaveCount(0);
  await page.goto('/parent/billing');
  await expect(page.getByRole('button', { name: 'Explore Family' })).toBeDisabled();
  await page.goto('/parent/dashboard');
  await page.screenshot({ path: 'test-results/parent-desktop.png', fullPage: true });
});
test('marketing and child surfaces adapt without horizontal overflow or free text', async ({
  page,
}) => {
  await page.goto('/');
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/play', '/parent/children', '/sign-up', '/privacy']) {
    await page.goto(route);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/mobile-${route.replaceAll('/', '') || 'landing'}.png`,
      fullPage: true,
    });
  }
  await page.goto('/play');
  await expect(page.locator('input[type=text],textarea,[contenteditable=true]')).toHaveCount(0);
});
test('session route rejects missing and mismatched origins before authentication', async ({
  request,
}) => {
  expect((await request.post('/api/session', { data: { idToken: 'invalid' } })).status()).toBe(403);
  expect(
    (
      await request.post('/api/session', {
        headers: { Origin: 'https://wrong.example' },
        data: { idToken: 'invalid' },
      })
    ).status(),
  ).toBe(403);
});

test('coalesces slider transport, preserves values during asset updates, and resets cleanly', async ({
  page,
}) => {
  const values: number[] = [];
  page.on('websocket', (socket) =>
    socket.on('framesent', (event) => {
      if (typeof event.payload === 'string') {
        try {
          const message = JSON.parse(event.payload);
          if (message.type === 'variable') values.push(message.value);
        } catch {}
      }
    }),
  );
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page
    .getByRole('button', { name: /^Talk to / })
    .first()
    .click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Cannon and Cup', exact: true }).click();
  const slider = page.getByRole('slider').first();
  await expect(slider).toBeVisible();
  const initial = await slider.inputValue();
  await slider.focus();
  await slider.press('Home');
  for (let i = 0; i < 20; i++) await slider.press('ArrowRight');
  const selected = await slider.inputValue();
  await page.waitForTimeout(500);
  expect(values.length).toBeGreaterThan(0);
  expect(values.length).toBeLessThan(20);
  expect(values.at(-1)).toBe(Number(selected));
  await page.waitForTimeout(2000);
  await expect(slider).toHaveValue(selected);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await expect(slider).toHaveValue(initial);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Cannon and Cup', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'World actions' }).getByRole('button').first(),
  ).toBeVisible();
  await page
    .getByRole('region', { name: 'World actions' })
    .getByRole('button')
    .first()
    .press('ArrowUp');
});

test('landing gravity experiment responds to choices and opens the explorer picker', async ({
  page,
}) => {
  await page.goto('/');
  const ball = page.locator('.gravity-ball');
  const initial = await ball.getAttribute('transform');
  await page.getByRole('button', { name: 'Moon', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Moon', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.gravity-reading')).toContainText('1.62 m/s²');
  await expect.poll(() => ball.getAttribute('transform')).not.toBe(initial);
  await page.getByRole('button', { name: 'Earth', exact: true }).click();
  await expect(page.locator('.gravity-reading')).toContainText('9.81 m/s²');
  await page.locator('#parents').click();
  await expect(page.getByRole('heading', { name: 'Who’s imagining today?' })).toBeVisible();
});

test('an earned local bounce discovery survives the trip to parent space', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await page.waitForTimeout(900);
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('World canvas has no bounds');
  const point = (x: number, y: number) => ({
    x: box.x + (box.width * x) / 16,
    y: box.y + (box.height * y) / 9,
  });
  const dragon = point(5, 1.8),
    release = point(9, 3);
  await page.mouse.move(dragon.x, dragon.y);
  await page.mouse.down();
  await page.mouse.move(release.x, release.y, { steps: 30 });
  await page.waitForTimeout(400);
  await page.mouse.up();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem('ji-discoveries:c_fixture') || '[]').map(
            (card: { concept: string }) => card.concept,
          ),
        ),
      { timeout: 8000 },
    )
    .toContain('bounce');
  await expect(page.getByRole('button', { name: 'bounce', exact: true })).toHaveCount(0);
  await openParentSpace(page, '/parent/dashboard');
  await expect(page.locator('.parent-discovery').first()).toBeVisible();
});

test('the parent space locks once a child screen opens, and playing stays open', async ({
  page,
}) => {
  const gate = page.getByRole('heading', { name: 'Grown-ups only', exact: true });
  await openParentSpace(page, '/parent/children');
  await page.goto('/parent/billing');
  await expect(page.locator('.parent-shell')).toBeVisible();
  await page.getByRole('link', { name: /Let’s play/ }).click();
  await expect(page.getByRole('heading', { name: 'Who’s imagining today?' })).toBeVisible();
  // Back must not reopen the parent page the browser kept in its history.
  await page.goBack();
  await expect(gate).toBeVisible();
  await expect(page.locator('.parent-shell')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to playing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Who’s imagining today?' })).toBeVisible();
  await page.goto('/parent/dashboard');
  await expect(gate).toBeVisible();
  await page.screenshot({ path: 'test-results/parent-gate-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Open the parent space', exact: true }).click();
  await expect(page.locator('.parent-shell')).toBeVisible();
});
