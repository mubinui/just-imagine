import { test, expect } from '@playwright/test';

test('a chosen friend follows navigation and Exit Studio ends voice until another explicit talk', async ({
  page,
}) => {
  const errors: string[] = [],
    sockets: { url: string; closed: boolean }[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('websocket', (socket) => {
    if (!socket.url().includes('8787')) return;
    const connection = { url: socket.url(), closed: false };
    sockets.push(connection);
    socket.on('close', () => (connection.closed = true));
  });
  await page.goto('/parent/children');
  const setup = page.getByRole('region', { name: 'Ari companion', exact: true });
  await setup.getByLabel("Friend's name").fill('Pip');
  await setup.getByRole('button', { name: 'Mishti the dreamer' }).click();
  await setup.getByRole('button', { name: 'Save their friend' }).click();
  await expect(setup.getByRole('status')).toContainText('Pip is ready');
  await setup.getByRole('button', { name: 'Make a chibi from a photo' }).click();
  await expect(setup.getByRole('button', { name: 'Draw their chibi friend' })).toBeDisabled();
  await expect(setup).toContainText('Photo drawing needs the connected Gemini service');
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page.locator('.engine-host canvas')).toBeVisible();
  await page
    .getByRole('button', { name: /^Talk to / })
    .first()
    .click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a friend', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pip', exact: true })).toBeVisible();
  await expect(page.locator('.studio-dock').getByRole('link')).toHaveCount(0);
  await page.getByRole('button', { name: 'Exit Studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A lovely place to pause.' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Call ended · Microphone off');
  await expect.poll(() => sockets.filter((socket) => socket.closed).length).toBe(1);
  await page
    .getByRole('navigation', { name: 'Other adventures', exact: true })
    .getByRole('link', { name: 'My worlds', exact: true })
    .click();
  await expect(page).toHaveURL(/\/gallery$/);
  const assistant = page.getByRole('button', { name: 'Live assistant: Pip', exact: true });
  await assistant.click();
  await expect(
    page
      .getByRole('region', { name: 'Live assistant', exact: true })
      .getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(assistant).toBeFocused();
  await page.keyboard.press('Enter');
  await page
    .getByRole('navigation', { name: 'Your spaces', exact: true })
    .getByRole('link', { name: 'Studio', exact: true })
    .click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.locator('.engine-host canvas')).toBeVisible();
  await expect(page.locator('.stage-status')).toContainText('Voice off');
  expect(sockets).toHaveLength(1);
  await page.getByRole('button', { name: 'Talk to Pip', exact: true }).click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  await expect(page.locator('.stage-error')).toHaveCount(0);
  expect(sockets).toHaveLength(2);
  expect(errors).toEqual([]);
});
