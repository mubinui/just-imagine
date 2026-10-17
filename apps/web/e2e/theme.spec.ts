import { test, expect } from '@playwright/test';

test('Studio theme choices apply immediately and Escape restores focus to the chooser', async ({
  page,
}) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('button', { name: 'bounce', exact: true }).click();
  const root = page.locator('html');
  const trigger = page.getByRole('button', { name: 'App theme', exact: true });
  const panel = page.getByRole('dialog', { name: 'App theme', exact: true });
  await expect(root).toHaveAttribute('data-theme', 'forest');
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute('aria-modal', 'true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const ocean = panel.getByRole('radio', { name: 'Ocean', exact: true });
  await ocean.check();
  await expect(ocean).toBeChecked();
  await expect(root).toHaveAttribute('data-theme', 'ocean');
  await expect(trigger).toContainText('Ocean');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('ji-theme-preference')))
    .toBe('ocean');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();

  await trigger.press('Enter');
  await expect(panel).toBeVisible();
  const appDefault = panel.getByRole('radio', { name: 'App default', exact: true });
  await appDefault.check();
  await expect(appDefault).toBeChecked();
  await expect(root).toHaveAttribute('data-theme', 'forest');
  await expect(root).toHaveAttribute('data-theme-preference', 'default');
  await expect(trigger).toContainText('App default');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('ji-theme-preference')))
    .toBeNull();
});

test('Learn navigation remains visible before, during and after choosing a theme', async ({
  page,
}) => {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await page.getByRole('button', { name: 'Exit Studio', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Other adventures', exact: true })
    .getByRole('link', { name: 'Learn', exact: true })
    .click();
  await expect(page).toHaveURL(/\/learn$/);
  const navigation = page.getByRole('navigation', { name: 'Your spaces', exact: true });
  const trigger = page.getByRole('button', { name: 'App theme', exact: true });
  const panel = page.getByRole('dialog', { name: 'App theme', exact: true });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Learn', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(navigation).toBeVisible();
  await panel.getByRole('radio', { name: 'Ocean', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await expect(navigation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(navigation).toBeVisible();
});
