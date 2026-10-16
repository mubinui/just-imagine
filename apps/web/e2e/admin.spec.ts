import { test, expect, type Page } from '@playwright/test';

/*
 * Operator console against a real local stack (not fake mode: /admin needs a verified
 * session cookie with the admin claim). See the "Run" block in the final report or:
 *   ADMIN_E2E_EMAIL=admin@justimagine.test ADMIN_E2E_PASSWORD='OperateJoy!2026' \
 *   PLAYWRIGHT_BASE_URL=http://localhost:3310 pnpm --filter @just-imagine/web exec playwright test e2e/admin.spec.ts
 * Optional: PARENT_E2E_EMAIL / PARENT_E2E_PASSWORD (a non-admin account), ADMIN_E2E_CHILD_NAMES
 * (comma-separated explorer names that must never appear), ADMIN_E2E_SHOTS (screenshot folder).
 */
const email = process.env['ADMIN_E2E_EMAIL'];
const password = process.env['ADMIN_E2E_PASSWORD'];
const childNames = (process.env['ADMIN_E2E_CHILD_NAMES'] ?? 'Ari')
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean);
const shots = process.env['ADMIN_E2E_SHOTS'];

test.skip(
  !email || !password,
  'Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD to run against a local stack',
);

async function signIn(page: Page, user: string, secret: string) {
  await page.goto('/admin/sign-in');
  await page.getByLabel('Email').fill(user);
  await page.getByLabel('Password').fill(secret);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
async function expectNoChildNames(page: Page) {
  const text = await page.locator('main').innerText();
  for (const name of childNames) expect(text).not.toMatch(new RegExp(`\\b${name}\\b`));
}
async function capture(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test('the console sends signed-out visitors to operator sign-in', async ({ page }) => {
  await page.goto('/admin/families');
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Operator sign-in' })).toBeVisible();
});

test('a parent account is refused at operator sign-in', async ({ page }) => {
  const parent = process.env['PARENT_E2E_EMAIL'];
  const secret = process.env['PARENT_E2E_PASSWORD'];
  test.skip(!parent || !secret, 'Set PARENT_E2E_EMAIL and PARENT_E2E_PASSWORD');
  await signIn(page, parent!, secret!);
  await expect(page.locator('.adm-alert')).toContainText('not an operator account');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test('an admin signs in and every console page loads real data without child names', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page, email!, password!);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByText(/Figures as of/)).toBeVisible();
  await expectNoChildNames(page);
  await capture(page, 'admin-overview');

  await page.getByRole('link', { name: 'Families' }).click();
  await expect(page.getByRole('heading', { name: 'Families', level: 1 })).toBeVisible();
  const first = page.locator('.adm-row-open').first();
  await expect(first).toBeVisible();
  await first.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('heading', { name: 'Actions' })).toBeVisible();
  await expect(drawer.getByText('Explorers', { exact: true })).toBeVisible();
  const drawerText = await drawer.innerText();
  for (const name of childNames) expect(drawerText).not.toMatch(new RegExp(`\\b${name}\\b`));
  await expect(drawer.getByRole('button', { name: 'Delete family data' })).toBeDisabled();
  await capture(page, 'admin-family-drawer');
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();
  await expectNoChildNames(page);
  await capture(page, 'admin-families');

  for (const [link, heading, shot] of [
    ['Safety', 'Safety', 'admin-safety'],
    ['Content', 'Content', 'admin-content'],
    ['Appearance', 'Appearance', 'admin-appearance'],
    ['System', 'System', 'admin-system'],
    ['Audit log', 'Audit log', 'admin-audit'],
  ] as const) {
    await page.getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await expect(page.locator('.adm-skeleton')).toHaveCount(0);
    await expect(page.locator('.adm-alert')).toHaveCount(0);
    await expectNoChildNames(page);
    await capture(page, shot);
  }
  await page.getByRole('link', { name: 'System' }).click();
  await expect(
    page.getByRole('button', { name: /Pause all generation|Resume generation/ }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
