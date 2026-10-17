import { test, expect } from '@playwright/test';

test('parent chooses a friend and the same voice session follows navigation across child screens', async ({
  page,
}) => {
  const errors: string[] = [],
    sockets: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('websocket', (socket) => {
    if (socket.url().includes('8787')) sockets.push(socket.url());
  });
  await page.goto('/parent/children');
  const setup = page.getByRole('region', { name: "Ari's companion" });
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
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pip', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Your spaces', exact: true })
    .getByRole('link', { name: 'Worlds', exact: true })
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
  await expect(page.locator('.stage-error')).toHaveCount(0);
  expect(sockets).toHaveLength(1);
  expect(errors).toEqual([]);
});
