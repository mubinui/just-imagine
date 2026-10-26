import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';

/*
 * End-to-end functional flows for the schools product against a real local stack:
 * teacher console, student study room and operator console. Run from apps/web:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3300 SCHOOL_E2E_EMAIL=… SCHOOL_E2E_PASSWORD=… \
 *   SCHOOL_E2E_CODE=… STUDENT_E2E_USERNAME=… STUDENT_E2E_PIN=… ADMIN_E2E_EMAIL=… \
 *   ADMIN_E2E_PASSWORD=… ./node_modules/.bin/playwright test e2e/school-flows.spec.ts
 * Optional: SCHOOL_E2E_SHOTS (folder for screenshots of key states).
 *
 * The flows build on each other (a class, then a student in it, then a lesson scoped to that
 * class, then that student studies it). Tests are not in serial mode so a failure in one flow
 * does not hide the others; the shared names live in a state file under test-results, and the
 * new student's one-time PIN is kept only in memory (a fresh worker resets it via the teacher UI).
 * Every test creates names with a run suffix, and the last test removes what the run created.
 */
const env = {
  teacherEmail: process.env['SCHOOL_E2E_EMAIL'],
  teacherPassword: process.env['SCHOOL_E2E_PASSWORD'],
  schoolCode: process.env['SCHOOL_E2E_CODE'],
  studentUsername: process.env['STUDENT_E2E_USERNAME'],
  studentPin: process.env['STUDENT_E2E_PIN'],
  adminEmail: process.env['ADMIN_E2E_EMAIL'],
  adminPassword: process.env['ADMIN_E2E_PASSWORD'],
};
const missing = Object.entries({
  SCHOOL_E2E_EMAIL: env.teacherEmail,
  SCHOOL_E2E_PASSWORD: env.teacherPassword,
  SCHOOL_E2E_CODE: env.schoolCode,
  STUDENT_E2E_USERNAME: env.studentUsername,
  STUDENT_E2E_PIN: env.studentPin,
  ADMIN_E2E_EMAIL: env.adminEmail,
  ADMIN_E2E_PASSWORD: env.adminPassword,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
test.skip(
  missing.length > 0,
  `Set ${missing.join(', ')} to run the school flows against a local stack`,
);
test.use({ screenshot: 'only-on-failure', trace: 'retain-on-failure' });

const shots = process.env['SCHOOL_E2E_SHOTS'];
const CART = 'Force: start the cart';
const MOTION = 'Motion: graphs tell a story';
const SHARED_LESSON = 'Energy: the swinging pendulum';
const NAME_PREFIX = 'E2E Flow ';
const USER_PREFIX = 'e2eflow-';

// ---------- shared run state ----------

type RunState = {
  run: string;
  className: string;
  firstName: string;
  username: string;
  cartLessonId?: string;
  cartScopeBefore?: string;
  homeCounts?: { students: number; classes: number };
  studentPoints?: number;
  adminReason?: string;
  motionLessonId?: string;
  motionStepsBefore?: number;
};
const stateFile = fileURLToPath(
  new URL('../test-results/school-flows-state.json', import.meta.url),
);
let pinInMemory: string | undefined;
function loadState(): RunState {
  if (existsSync(stateFile)) return JSON.parse(readFileSync(stateFile, 'utf8')) as RunState;
  const run = Date.now().toString(36);
  const fresh: RunState = {
    run,
    className: `${NAME_PREFIX}${run}`,
    firstName: `Flow${run.slice(-4)}`,
    username: `${USER_PREFIX}${run}`,
  };
  saveState(fresh);
  return fresh;
}
function saveState(next: RunState) {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(next, null, 2));
}
function patchState(patch: Partial<RunState>) {
  const next = { ...loadState(), ...patch };
  saveState(next);
  return next;
}

// ---------- helpers ----------

async function capture(page: Page, name: string) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
/** Accepts every confirm() and remembers what it asked. */
function acceptDialogs(page: Page) {
  const asked: string[] = [];
  page.on('dialog', (dialog) => {
    asked.push(dialog.message());
    void dialog.accept();
  });
  return asked;
}
const toast = (page: Page) => page.locator('.sch-toast');

async function teacherSignIn(page: Page) {
  await page.goto('/school/sign-in');
  await page.getByLabel('Email').fill(env.teacherEmail!);
  await page.getByLabel('Password').fill(env.teacherPassword!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/school$/, { timeout: 30_000 });
  await expect(page.locator('.sch-loading')).toHaveCount(0, { timeout: 30_000 });
}
async function studentSignIn(page: Page, username: string, pin: string) {
  await page.goto('/study/sign-in');
  await page.getByLabel('School code').fill(env.schoolCode!);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function adminSignIn(page: Page) {
  await page.goto('/admin/sign-in');
  await page.getByLabel('Email').fill(env.adminEmail!);
  await page.getByLabel('Password').fill(env.adminPassword!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
}
const navLink = (page: Page, name: string) =>
  page.locator('aside.sch-nav nav').getByRole('link', { name, exact: true });
const statValue = (page: Page, label: string) =>
  page
    .locator('.sch-stat')
    .filter({ has: page.locator('dt', { hasText: label }) })
    .locator('.sch-stat-value');
async function readCount(locator: Locator) {
  await expect(locator).toHaveText(/\d/, { timeout: 20_000 });
  return Number((await locator.innerText()).trim());
}
const rosterRow = (page: Page, username: string) =>
  page
    .locator('table.sch-roster-table tbody tr')
    .filter({ has: page.locator('code.sch-username', { hasText: new RegExp(`^${username}$`) }) });
async function classRow(page: Page, name: string) {
  const rows = page.locator('form.sch-class-row');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  const values = await rows
    .locator('input[name="name"]')
    .evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
  const index = values.indexOf(name);
  return index < 0 ? null : rows.nth(index);
}
async function readPinDialog(page: Page, firstName: string) {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `New PIN for ${firstName}` })).toBeVisible({
    timeout: 20_000,
  });
  await expect(dialog.getByText('This PIN is shown only once.', { exact: false })).toBeVisible();
  const pin = (await dialog.locator('.sch-pin code').innerText()).trim();
  return { dialog, pin };
}
async function closePinDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /saved it/ }).click();
  await expect(dialog).toBeHidden();
}
async function openLessonFromLibrary(page: Page, title: string) {
  await page.goto('/school/lessons');
  const row = page
    .locator('li.sch-lesson-row')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  await row.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/school\/lessons\/[^/]+$/);
  await expect(page.locator('.sch-editor-title h1')).toHaveText(title, { timeout: 20_000 });
  await expect(page.locator('.sch-save-state')).toHaveText('All changes saved');
  return page.url().split('/').pop()!;
}
const promptField = (page: Page, label: string) =>
  page
    .locator('label.sch-field')
    .filter({ has: page.locator(':scope > span', { hasText: new RegExp(`^${label}$`) }) })
    .locator('textarea')
    .first();
const steps = (page: Page) => page.locator('ol.sch-step-list > li');
const editorStatus = (page: Page) => page.locator('.sch-editor-title .sch-status');
const readiness = (page: Page) => page.locator('#publish-readiness');
async function saveLesson(page: Page) {
  await page.locator('.sch-editor-actions').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.sch-save-state')).toHaveText('All changes saved', {
    timeout: 30_000,
  });
}
/** The student's PIN from this worker, or a fresh one reset through the teacher console. */
async function ensurePin(browser: Browser): Promise<string> {
  if (pinInMemory) return pinInMemory;
  const state = loadState();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await teacherSignIn(page);
    await page.goto('/school/students');
    const row = rosterRow(page, state.username);
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await row.getByRole('button', { name: 'Reset PIN' }).click();
    const { pin } = await readPinDialog(page, state.firstName);
    await closePinDialog(page);
    pinInMemory = pin;
    return pin;
  } finally {
    await context.close();
  }
}

// ---------- teacher ----------

test('1. teacher signs in; home shows the school and its counts; language switches both ways', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await teacherSignIn(page);
  const schoolName = (await page.locator('.sch-school-name').innerText()).trim();
  expect(schoolName).not.toBe('');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(schoolName);
  await expect(page.locator('.sch-code-chip code')).toHaveText(env.schoolCode!);
  const students = await readCount(statValue(page, 'Students'));
  const classes = await readCount(statValue(page, 'Classes'));
  const lessons = await readCount(statValue(page, 'Lessons'));
  expect(lessons).toBeGreaterThan(0);
  patchState({ homeCounts: { students, classes } });
  await expect(page.locator('.sch-stat', { hasText: 'Lessons' })).toContainText(
    /\d+ school · \d+ shared/,
  );
  for (const name of ['Home', 'Classes', 'Students', 'Lessons', 'Results', 'Leaderboard'])
    await expect(navLink(page, name)).toBeVisible();
  await capture(page, '01-teacher-home-en');

  const language = page.locator('header .sch-language select');
  await language.selectOption('bn');
  for (const name of ['শুরু', 'ক্লাস', 'শিক্ষার্থী', 'পাঠ', 'ফলাফল', 'সেরা শিক্ষার্থী'])
    await expect(navLink(page, name)).toBeVisible();
  await expect(navLink(page, 'Classes')).toHaveCount(0);
  await expect(page.locator('.sch-stat dt').first()).toHaveText('শিক্ষার্থী');
  await expect(statValue(page, 'শিক্ষার্থী')).toHaveText(/^[০-৯]+$/);
  const bnName = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
  expect(bnName).not.toBe('');
  expect.soft(bnName, 'the Bangla school name is shown in Bangla').not.toBe(schoolName);
  await capture(page, '01-teacher-home-bn');

  await language.selectOption('en');
  for (const name of ['Home', 'Classes', 'Students', 'Lessons', 'Results', 'Leaderboard'])
    await expect(navLink(page, name)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(schoolName);
  expect(errors).toEqual([]);
});

test('2. teacher creates a grade 9 class and sees it listed', async ({ page }) => {
  const errors = trackErrors(page);
  const state = loadState();
  await teacherSignIn(page);
  await navLink(page, 'Classes').click();
  await expect(page.getByRole('heading', { name: 'Classes', level: 1 })).toBeVisible();
  const form = page.locator('#new-class');
  await form.getByLabel('Class name').fill(state.className);
  await form.getByLabel('Grade').selectOption('9');
  await form.getByLabel('Section').fill('Z');
  await form.getByRole('button', { name: 'Create class' }).click();
  await expect(toast(page)).toContainText('Class created.', { timeout: 20_000 });
  await expect(form.getByLabel('Class name')).toHaveValue('');
  await expect.poll(async () => Boolean(await classRow(page, state.className))).toBe(true);
  const row = (await classRow(page, state.className))!;
  await expect(row.locator('.sch-class-meta')).toContainText('Grade 9 · Section Z · 0 Students');
  await expect(row.locator('.sch-class-roster')).toContainText('No students in this class yet.');
  await expect(row.getByLabel('Show leaderboard to this class')).toBeChecked();
  await expect(row.getByRole('button', { name: 'Remove' })).toBeEnabled();

  // A duplicate name is refused before it reaches the server.
  await form.getByLabel('Class name').fill(state.className);
  await form.getByRole('button', { name: 'Create class' }).click();
  await expect(form).toContainText('Another class already has this name.');
  await form.getByLabel('Class name').fill('');
  await capture(page, '02-classes-created');
  expect(errors).toEqual([]);
});

test('3. teacher adds a student, gets a one-time PIN, resets it, suspends and restores', async ({
  page,
}) => {
  const errors = trackErrors(page);
  const asked = acceptDialogs(page);
  const state = loadState();
  await teacherSignIn(page);
  await navLink(page, 'Students').click();
  await expect(page.getByRole('heading', { name: 'Students', level: 1 })).toBeVisible();
  const form = page.locator('#add-student');
  await expect(form.getByLabel('Class')).toContainText(state.className, { timeout: 20_000 });
  await form.getByLabel('First name').fill(state.firstName);
  await form.getByLabel('Username').fill(state.username);
  await form.getByLabel('Class').selectOption({ label: state.className });
  await form.getByLabel('Language').selectOption('en');
  await form.getByLabel('Avatar').selectOption('owl');
  await form.getByRole('button', { name: 'Add student' }).click();

  const first = await readPinDialog(page, state.firstName);
  expect(first.pin).toMatch(/^\d{6}$/);
  await expect(first.dialog).toContainText(state.username);
  await expect(first.dialog).toContainText(env.schoolCode!);
  await capture(page, '03-student-pin-dialog');
  // Escape must not close the one-time PIN.
  await page.keyboard.press('Escape');
  await expect(first.dialog).toBeVisible();
  await closePinDialog(page);
  pinInMemory = first.pin;

  const row = rosterRow(page, state.username);
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  await expect(row.locator('th')).toHaveText(state.firstName);
  await expect(row).toContainText(state.className);
  await expect(row.locator('.sch-status')).toHaveText('Active');

  // Reset PIN: a new six-digit PIN replaces the first.
  await row.getByRole('button', { name: 'Reset PIN' }).click();
  const second = await readPinDialog(page, state.firstName);
  expect(second.pin).toMatch(/^\d{6}$/);
  expect(second.pin).not.toBe(first.pin);
  await closePinDialog(page);
  pinInMemory = second.pin;

  // Suspend, then restore.
  await row.getByLabel(`More actions for ${state.firstName}`).click();
  await row.getByRole('button', { name: 'Suspend' }).click();
  await expect(toast(page)).toContainText(
    `${state.firstName} is suspended and has been signed out.`,
    {
      timeout: 20_000,
    },
  );
  expect(asked.at(-1)).toContain(`Suspend ${state.firstName}?`);
  await expect(row.locator('.sch-status')).toHaveText('Suspended');
  await expect(row.getByRole('button', { name: 'Reset PIN' })).toBeDisabled();
  await capture(page, '03-student-suspended');
  await row.getByLabel(`More actions for ${state.firstName}`).click();
  await row.getByRole('button', { name: 'Restore' }).click();
  await expect(toast(page)).toContainText(`${state.firstName} can sign in again.`, {
    timeout: 20_000,
  });
  await expect(row.locator('.sch-status')).toHaveText('Active');
  await expect(row.getByRole('button', { name: 'Reset PIN' })).toBeEnabled();

  // The class lists the student, and home counts the new student and class.
  await navLink(page, 'Classes').click();
  const cls = await classRow(page, state.className);
  expect(cls).not.toBeNull();
  await expect(cls!.locator('.sch-class-meta')).toContainText('1 Students');
  await expect(cls!.locator('.sch-class-roster')).toContainText(state.firstName);
  await expect(cls!.getByRole('button', { name: 'Remove' })).toBeDisabled();
  await expect(cls!).toContainText('Move or remove its 1 students before removing this class.');
  await navLink(page, 'Home').click();
  if (state.homeCounts) {
    await expect(statValue(page, 'Students')).toHaveText(String(state.homeCounts.students + 1));
    await expect(statValue(page, 'Classes')).toHaveText(String(state.homeCounts.classes + 1));
  }
  expect(errors).toEqual([]);
});

test('4. teacher scopes "Force: start the cart" to the new class, approves both languages and publishes', async ({
  page,
}) => {
  const errors = trackErrors(page);
  const asked = acceptDialogs(page);
  const state = loadState();
  await teacherSignIn(page);
  const id = await openLessonFromLibrary(page, CART);
  const scope = page.getByLabel('Who can study this lesson?');
  patchState({ cartLessonId: id, cartScopeBefore: await scope.inputValue() });

  await scope.selectOption('class');
  const box = page.locator('.sch-scope').getByRole('checkbox', { name: state.className });
  await expect(box).toBeVisible();
  await box.check();
  await expect(page.locator('.sch-save-state')).toHaveText('Unsaved changes');
  await expect(readiness(page)).toContainText('Save your changes.');
  await capture(page, '04-cart-scope-class');
  await saveLesson(page);
  await expect(toast(page)).toContainText('Lesson saved.');
  await expect(scope).toHaveValue('class');
  await expect(box).toBeChecked();

  const actions = page.locator('.sch-editor-actions');
  await actions.getByRole('button', { name: 'Approve English' }).click();
  await expect(actions.getByRole('button', { name: 'English approved' })).toBeDisabled({
    timeout: 30_000,
  });
  await actions.getByRole('button', { name: 'Approve বাংলা' }).click();
  await expect(actions.getByRole('button', { name: 'বাংলা approved' })).toBeDisabled({
    timeout: 30_000,
  });
  const publish = actions.getByRole('button', { name: 'Publish lesson' });
  const ready = await publish.isEnabled();
  if (!ready) {
    const why = await readiness(page).innerText();
    test.info().annotations.push({ type: 'publish-blocked', description: why });
    await capture(page, '04-cart-publish-blocked');
  }
  expect(ready, `Publish is blocked: ${await readiness(page).innerText()}`).toBe(true);
  await expect(readiness(page)).toContainText('Ready to publish');
  await publish.click();
  await expect(toast(page)).toContainText(
    'Published. Students in the chosen classes can open it now.',
    { timeout: 30_000 },
  );
  await expect(editorStatus(page)).toHaveText('Published');
  await expect(readiness(page)).toContainText('Published — students can open it');
  await capture(page, '04-cart-published');

  // The library reflects the new status after a reload.
  await page.goto('/school/lessons');
  const row = page
    .locator('li.sch-lesson-row')
    .filter({ has: page.getByRole('heading', { name: CART, exact: true }) });
  await expect(row.locator('.sch-status').first()).toHaveText('Published', { timeout: 20_000 });
  expect(asked).toEqual([]);
  expect(errors).toEqual([]);
});

test('5. teacher generates a lab from a description, adds it, saves, discards one, and is blocked without simulations', async ({
  page,
}) => {
  test.setTimeout(720_000);
  const errors = trackErrors(page);
  acceptDialogs(page);
  await teacherSignIn(page);
  const motionId = await openLessonFromLibrary(page, MOTION);
  const before = await steps(page).count();
  expect(before).toBeGreaterThan(0);
  patchState({ motionLessonId: motionId, motionStepsBefore: before });

  await page.getByRole('button', { name: 'Lab from a description' }).click();
  const panel = page.locator('section[aria-labelledby="lab-generator-title"]');
  await expect(panel.getByRole('heading', { name: 'Describe a lab' })).toBeVisible();
  const generate = panel.getByRole('button', { name: 'Generate lab' });
  await expect(generate).toBeDisabled();
  await panel.getByLabel('What should students do?').fill('short');
  await expect(panel).toContainText('Describe the lab in at least 8 characters.');
  await expect(generate).toBeDisabled();
  const description =
    'A ball is launched from a 5 m high cliff at 18 m/s. Students find the launch angle that gives the longest horizontal range and compare it with 45 degrees.';
  await panel.getByLabel('What should students do?').fill(description);
  await expect(panel.locator('#lab-description-count')).toHaveText(`${description.length}/800`);
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(panel.getByRole('status')).toContainText('Choosing and checking a simulation…');
  const proposal = panel.locator('section[aria-labelledby="lab-proposal-title"]');
  await expect(proposal.locator('#lab-proposal-title')).toBeVisible({ timeout: 240_000 });
  await expect(proposal).toContainText('Proposed lab ·');
  await expect(proposal.getByRole('heading', { name: 'Starting values', level: 4 })).toBeVisible();
  await expect(proposal.getByRole('heading', { name: 'Guiding prompts', level: 4 })).toBeVisible();
  await expect(proposal.getByRole('heading', { name: 'Graded task', level: 4 })).toBeVisible();
  await expect(proposal.locator('dl dt').first()).toBeVisible();
  expect(await proposal.locator('ol li').count()).toBeGreaterThan(0);
  await expect(proposal).not.toContainText('No graded task');
  await capture(page, '05-lab-proposal');
  await proposal.getByRole('button', { name: 'Add to lesson' }).click();
  await expect(panel.getByRole('status')).toHaveText(
    'Lab added at the end of the lesson. Review it, then save.',
  );
  await expect(steps(page)).toHaveCount(before + 2);
  await expect(steps(page).nth(before).locator('.sch-step-kind')).toHaveText(
    'Explore a simulation',
  );
  await expect(
    steps(page)
      .nth(before + 1)
      .locator('.sch-step-kind'),
  ).toHaveText('Quiz');
  await expect(page.locator('.sch-save-state')).toHaveText('Unsaved changes');
  await saveLesson(page);
  await expect(toast(page)).toContainText('Lesson saved.');
  await page.reload();
  await expect(page.locator('.sch-editor-title h1')).toHaveText(MOTION, { timeout: 20_000 });
  await expect(steps(page)).toHaveCount(before + 2);
  await capture(page, '05-lab-added-saved');

  // Discard: a second proposal leaves the step list unchanged.
  await page.getByRole('button', { name: 'Lab from a description' }).click();
  await panel.getByLabel('What should students do?').fill(description);
  await panel.getByRole('button', { name: 'Generate lab' }).click();
  await expect(proposal.locator('#lab-proposal-title')).toBeVisible({ timeout: 240_000 });
  await proposal.getByRole('button', { name: 'Discard' }).click();
  await expect(panel.getByRole('status')).toHaveText(
    'Proposal discarded. Your lesson is unchanged.',
  );
  await expect(proposal).toHaveCount(0);
  await expect(steps(page)).toHaveCount(before + 2);
  await expect(page.locator('.sch-save-state')).toHaveText('All changes saved');
  await capture(page, '05-lab-discarded');

  // Restore the draft lesson: remove the two steps this run added, then save.
  for (let i = 0; i < 2; i++) {
    const last = steps(page).last();
    if (!(await last.locator(':scope > details').evaluate((d) => (d as HTMLDetailsElement).open)))
      await last.locator('summary').first().click();
    await last.locator('.sch-step-tools').getByRole('button', { name: 'Remove' }).click();
  }
  await expect(steps(page)).toHaveCount(before);
  await saveLesson(page);
  await page.reload();
  await expect(steps(page)).toHaveCount(before, { timeout: 20_000 });

  // A chapter without simulations: the lab cannot be generated and says why.
  await page.goto('/school/lessons/new');
  await expect(page.getByRole('heading', { name: 'Create lesson', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('combobox', { name: 'Subject', exact: true }).selectOption('physics');
  await page
    .getByRole('combobox', { name: 'Chapter', exact: true })
    .selectOption({ label: '8. Reflection of light' });
  await expect(page.getByRole('button', { name: 'Lab from a description' })).toBeDisabled();
  await expect(
    page.getByText(
      'This chapter has no simulations yet. Choose another chapter to generate a lab.',
    ),
  ).toBeVisible();
  await expect(
    page.locator('.sch-add-steps').getByRole('button', { name: '+ Explore a simulation' }),
  ).toHaveCount(0);
  await capture(page, '05-lab-no-simulations');
  expect(errors).toEqual([]);
});

test('6. teacher opens notes and worksheet, results and leaderboard', async ({ page }) => {
  const errors = trackErrors(page);
  const state = loadState();
  test.skip(!state.cartLessonId, 'Needs the cart lesson id from flow 4');
  await teacherSignIn(page);
  await page.goto(`/school/lessons/${state.cartLessonId}`);
  await expect(page.locator('.sch-editor-title h1')).toHaveText(CART, { timeout: 20_000 });
  await page.getByRole('link', { name: 'Notes and worksheet' }).click();
  await expect(page).toHaveURL(new RegExp(`/school/lessons/${state.cartLessonId}/materials$`));
  await expect(page.getByRole('heading', { name: CART, level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: 'Lesson notes', level: 2 })).toBeVisible();
  await expect(
    page.getByText('Answer keys and hints are omitted.', { exact: false }),
  ).toBeVisible();
  await capture(page, '06-teacher-notes');
  await page.getByRole('button', { name: 'Worksheet' }).click();
  await expect(page.getByRole('heading', { name: 'Worksheet', level: 2 })).toBeVisible();
  await page.getByLabel('Document language').selectOption('bn');
  await expect(page.getByRole('heading', { name: 'অনুশীলনপত্র', level: 2 })).toBeVisible();
  await capture(page, '06-teacher-worksheet-bn');

  await navLink(page, 'Results').click();
  await expect(page.getByRole('heading', { name: 'Results', level: 1 })).toBeVisible();
  await page
    .locator('.sch-results-filters')
    .getByLabel('Class')
    .selectOption({ label: state.className });
  await page.locator('.sch-results-filters').getByLabel('Lesson').selectOption(state.cartLessonId!);
  const table = page.locator('table.sch-results-table');
  await expect(table.locator('caption')).toContainText(CART, { timeout: 20_000 });
  await expect(table.locator('caption')).toContainText(/of 1 submitted/);
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody th')).toHaveText(state.firstName);
  await capture(page, '06-teacher-results');

  await navLink(page, 'Leaderboard').click();
  await expect(page.getByRole('heading', { name: 'Leaderboard', level: 1 })).toBeVisible();
  await page.getByLabel('Class or school').selectOption({ label: state.className });
  await expect(page.locator('.sch-board')).toContainText(state.className, { timeout: 20_000 });
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.locator('.sch-board .sch-error')).toHaveCount(0);
  await capture(page, '06-teacher-leaderboard');
  expect(errors).toEqual([]);
});

// ---------- student ----------

test('7. a wrong PIN is refused, then the new student signs in', async ({ page, browser }) => {
  const errors = trackErrors(page);
  const state = loadState();
  const pin = await ensurePin(browser);
  const wrong = String((Number(pin) + 1) % 1_000_000).padStart(6, '0');
  await studentSignIn(page, state.username, wrong);
  const alert = page.locator('.sch-auth').getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 20_000 });
  const message = (await alert.innerText()).trim();
  expect(message.length).toBeGreaterThan(0);
  test.info().annotations.push({ type: 'wrong-pin-message', description: message });
  await expect(page).toHaveURL(/\/study\/sign-in$/);
  await capture(page, '07-student-wrong-pin');

  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/study$/, { timeout: 30_000 });
  await expect(
    page.getByRole('heading', { name: `Welcome back, ${state.firstName}`, level: 1 }),
  ).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('8. the student studies "Force: start the cart": every step, the quick check and the quiz', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  const state = loadState();
  test.skip(!state.cartLessonId, 'Needs the cart lesson id from flow 4');
  const pin = await ensurePin(browser);
  await studentSignIn(page, state.username, pin);
  await expect(page).toHaveURL(/\/study$/, { timeout: 30_000 });
  const card = page.locator(`a.study-lesson[href="/study/lessons/${state.cartLessonId}"]`);
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('heading', { level: 2 })).toHaveText(CART);
  const sameTitle = await page
    .locator('a.study-lesson')
    .filter({ has: page.getByRole('heading', { name: CART, exact: true }) })
    .count();
  test.info().annotations.push({
    type: 'cards-titled-like-the-cart-lesson',
    description: String(sameTitle),
  });
  await capture(page, '08-student-home');
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/study/lessons/${state.cartLessonId}$`));
  await expect(page.getByRole('heading', { name: CART, level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  const tabs = page.locator('nav.study-step-tabs button');
  const total = await tabs.count();
  expect(total).toBe(4);
  const kinds = ['Introduction', 'Explore a simulation', 'Quick check', 'Quiz'];
  for (let i = 0; i < total; i++) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('.study-step-caption')).toHaveText(
      `Step ${i + 1} of ${total}: ${kinds[i]}`,
    );
  }
  await tabs.nth(0).click();
  await expect(page.locator('.study-step-copy')).toContainText('static friction');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.study-step-caption')).toHaveText(`Step 2 of 4: ${kinds[1]}`);
  await expect(page.locator('.stem-workspace')).toBeVisible();
  await capture(page, '08-student-explore');

  // Quick check: wrong once (feedback and a hint), then right.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.study-step-caption')).toHaveText(`Step 3 of 4: ${kinds[2]}`);
  const check = page.locator('section.study-question');
  await expect(check.getByRole('heading', { level: 2 })).toContainText(
    'What is the actual friction force?',
  );
  await check.getByLabel('Answer (N)').fill('5.88');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await expect(check.locator('.study-verdict')).toContainText('Not quite yet', { timeout: 20_000 });
  await expect(check.locator('.study-verdict')).toContainText(
    'Change your answer, open a hint or revisit the simulation, then submit again.',
  );
  await expect(check).toHaveAttribute('data-result', 'false');
  await check.getByRole('button', { name: 'Show hint 1 of 2' }).click();
  await expect(check.locator('ol.study-hints li')).toHaveCount(1, { timeout: 20_000 });
  await expect(check.locator('ol.study-hints li').first()).toContainText('Hint 1');
  await expect(check.getByRole('button', { name: 'Show hint 2 of 2' })).toBeVisible();
  await capture(page, '08-student-check-wrong-hint');
  await check.getByLabel('Answer (N)').fill('4');
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await expect(check.locator('.study-verdict')).toContainText('Correct', { timeout: 20_000 });
  await expect(check).toHaveAttribute('data-result', 'true');
  await capture(page, '08-student-check-right');

  // Quiz: each item answered from its own question text.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.study-step-caption')).toHaveText(`Step 4 of 4: ${kinds[3]}`);
  const questions = page.locator('section.study-question');
  await expect(questions).toHaveCount(5);
  // Only the question's own heading: a simulation task also renders a "Parameters" heading.
  const prompts = await questions.locator(':scope > h2').allInnerTexts();
  let max = 0;
  for (let i = 0; i < 5; i++) {
    const q = questions.nth(i);
    const prompt = prompts[i]!;
    const meta = await q.locator('.study-question-meta').innerText();
    max += Number(/(\d+) points?/.exec(meta)?.[1] ?? 0);
    if (/opposes sliding/.test(prompt)) await q.getByLabel('Friction', { exact: true }).check();
    else if (/maximum static friction/.test(prompt)) {
      expect(prompt).toContain('m = 2 kg and μs = 0.3');
      await q.getByLabel('Answer (N)').fill('5.88');
    } else if (/just above the static-friction limit/.test(prompt)) {
      // The task: push just above μs·m·g = 0.3 × 2 × 9.8 = 5.88 N.
      const force = q.getByLabel('Applied force value');
      await expect(force).toBeEnabled();
      await expect(q.getByLabel('Mass value')).toBeDisabled();
      await force.fill('5.9');
      await expect(force).toHaveValue('5.9');
    } else if (/find the acceleration/.test(prompt))
      await q.getByLabel('Answer (m/s²)').fill('3.04');
    else if (/doubling mass/.test(prompt)) await q.getByLabel('Half', { exact: true }).check();
    else throw new Error(`Unexpected quiz question: ${prompt}`);
  }
  await capture(page, '08-student-quiz-answered');
  await page.getByRole('button', { name: 'Submit quiz' }).click();
  const summary = page.locator('.study-submit-total');
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await capture(page, '08-student-quiz-result');
  for (let i = 0; i < 5; i++)
    await expect
      .soft(questions.nth(i), `quiz item ${i + 1}: ${prompts[i]}`)
      .toHaveAttribute('data-result', 'true');
  await expect(summary).toContainText(`Total ${max}/${max} points`);
  await expect(summary).toContainText(`+${max} now`);
  await expect(summary).toContainText('Every answer is correct.');
  await expect(page.locator('.study-complete')).toContainText(`Completed · ${max}/${max} points`);
  patchState({ studentPoints: max });

  await page.getByRole('link', { name: 'Finish lesson' }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(card).toContainText(`Completed · ${max}/${max} points`, { timeout: 20_000 });
  await expect(page.locator('.study-stats')).toContainText(String(max));
  expect(errors).toEqual([]);
});

test('9. the student sees their points on the leaderboard and mixes two reagents in the lab', async ({
  page,
  browser,
}) => {
  const errors = trackErrors(page);
  const state = loadState();
  const pin = await ensurePin(browser);
  await studentSignIn(page, state.username, pin);
  await expect(page).toHaveURL(/\/study$/, { timeout: 30_000 });
  await page.locator('aside.sch-nav').getByRole('link', { name: 'Leaderboard' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard', level: 1 })).toBeVisible();
  const standing = page.locator('.sch-board dl').first();
  await expect(standing).toContainText('Your points', { timeout: 20_000 });
  if (state.studentPoints) await expect(standing).toContainText(String(state.studentPoints));
  const mine = page.locator('table.sch-board-table tbody tr', { hasText: 'You' });
  await expect(mine).toHaveCount(1);
  await expect(mine).toContainText(state.firstName);
  await capture(page, '09-student-leaderboard');

  await page.locator('aside.sch-nav').getByRole('link', { name: 'Chemistry lab' }).click();
  await expect(page.getByRole('heading', { name: 'Chemistry lab', level: 1 })).toBeVisible();
  const mix = page.getByRole('button', { name: 'Mix in the beaker' });
  await expect(mix).toBeDisabled();
  const acid = page.locator('.stem-reagent', { hasText: 'Hydrochloric acid' }).first();
  const base = page.locator('.stem-reagent', { hasText: 'Sodium hydroxide' }).first();
  await acid.click();
  await base.click();
  await expect(acid).toHaveAttribute('aria-pressed', 'true');
  await expect(base).toHaveAttribute('aria-pressed', 'true');
  await expect(mix).toBeEnabled();
  await mix.click();
  const result = page.locator('.stem-lab-result');
  await expect(result.getByRole('heading', { name: 'Observations' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(result).toContainText('pH after mixing');
  await capture(page, '09-student-chem-lab');
  expect(errors).toEqual([]);
});

test('10. the student opens the lesson notes and worksheet', async ({ page, browser }) => {
  const errors = trackErrors(page);
  const state = loadState();
  test.skip(!state.cartLessonId, 'Needs the cart lesson id from flow 4');
  const pin = await ensurePin(browser);
  await studentSignIn(page, state.username, pin);
  await expect(page).toHaveURL(/\/study$/, { timeout: 30_000 });
  await page.goto(`/study/lessons/${state.cartLessonId}`);
  await page.getByRole('link', { name: 'Notes & worksheet' }).click();
  await expect(page).toHaveURL(new RegExp(`/study/lessons/${state.cartLessonId}/materials$`));
  await expect(page.getByRole('heading', { name: CART, level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: 'Lesson notes', level: 2 })).toBeVisible();
  await capture(page, '10-student-notes');
  await page.getByRole('button', { name: 'Worksheet' }).click();
  await expect(page.getByRole('heading', { name: 'Worksheet', level: 2 })).toBeVisible();
  await capture(page, '10-student-worksheet');
  await page.getByRole('link', { name: 'Back to lesson' }).click();
  await expect(page).toHaveURL(new RegExp(`/study/lessons/${state.cartLessonId}$`));
  expect(errors).toEqual([]);
});

test('10b. a student in another class cannot open the class-scoped lesson', async ({ page }) => {
  const errors = trackErrors(page);
  const state = loadState();
  test.skip(!state.cartLessonId, 'Needs the cart lesson id from flow 4');
  // Keep the seeded student's saved language: they study in Bangla.
  await page.goto('/study/sign-in');
  await page.locator('.sch-language select').selectOption('bn');
  await page.locator('input[name="schoolCode"]').fill(env.schoolCode!);
  await page.locator('input[name="username"]').fill(env.studentUsername!);
  await page.locator('input[name="pin"]').fill(env.studentPin!);
  await page.locator('form button.sch-primary').click();
  await expect(page).toHaveURL(/\/study$/, { timeout: 30_000 });
  await expect(page.locator('a.study-lesson').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(`a[href="/study/lessons/${state.cartLessonId}"]`)).toHaveCount(0);
  await page.goto(`/study/lessons/${state.cartLessonId}`);
  await expect(page.locator('.study-unavailable')).toBeVisible({ timeout: 20_000 });
  await capture(page, '10b-other-class-blocked');
  expect(errors).toEqual([]);
});

// ---------- operator ----------

test('11. the operator edits a shared lesson with an audit reason, restores it, and the audit log shows it', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  const asked = acceptDialogs(page);
  const state = loadState();
  const reason = `E2E flow check ${state.run}`;
  patchState({ adminReason: reason });
  await adminSignIn(page);
  await page.getByRole('link', { name: 'Lessons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lessons', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: SHARED_LESSON, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/lessons\/[^/]+$/);
  await expect(page.locator('.sch-editor-title h1')).toHaveText(SHARED_LESSON, {
    timeout: 20_000,
  });
  await expect(editorStatus(page)).toHaveText('Published');
  await page.getByLabel('Reason for the audit log').fill(reason);

  const prompt = promptField(page, 'Prompt 1');
  const original = await prompt.inputValue();
  expect(original.length).toBeGreaterThan(0);
  const [firstWord, ...rest] = original.split(' ');
  const changed = [`${firstWord}-e2e`, ...rest].join(' ');
  await prompt.fill(changed);
  await expect(readiness(page)).toContainText(
    'Saving takes this published lesson offline until it is re-approved and published.',
  );
  await saveLesson(page);
  expect(asked.at(-1)).toContain('This lesson is published. Saving will take it offline');
  await expect(prompt).toHaveValue(changed);
  await expect(editorStatus(page)).toHaveText('Draft');
  await capture(page, '11-admin-edited');
  await prompt.fill(original);
  await saveLesson(page);
  await expect(prompt).toHaveValue(original);

  // Put the shared lesson back online.
  const actions = page.locator('.sch-editor-actions');
  await actions.getByRole('button', { name: 'Approve English' }).click();
  await expect(actions.getByRole('button', { name: 'English approved' })).toBeDisabled({
    timeout: 30_000,
  });
  await actions.getByRole('button', { name: 'Approve বাংলা' }).click();
  await expect(actions.getByRole('button', { name: 'বাংলা approved' })).toBeDisabled({
    timeout: 30_000,
  });
  await actions.getByRole('button', { name: 'Publish lesson' }).click();
  await expect(editorStatus(page)).toHaveText('Published', { timeout: 30_000 });
  await page.reload();
  await expect(page.locator('.sch-editor-title h1')).toHaveText(SHARED_LESSON, {
    timeout: 20_000,
  });
  await expect(editorStatus(page)).toHaveText('Published');
  await expect(promptField(page, 'Prompt 1')).toHaveValue(original);

  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible();
  const rows = page.locator('table.adm-audit tbody tr', { hasText: reason });
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  const count = await rows.count();
  test.info().annotations.push({
    type: 'audit-rows-for-this-run',
    description: (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | '),
  });
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(rows.first()).toContainText(env.adminEmail!);
  await capture(page, '11-admin-audit');
  expect(errors).toEqual([]);
});

// ---------- cleanup ----------

test('12. teacher checks the result, restores the cart lesson scope, removes the test student and class', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  const asked = acceptDialogs(page);
  const state = loadState();
  await teacherSignIn(page);

  if (state.cartLessonId) {
    // The submission reached the teacher's results.
    await navLink(page, 'Results').click();
    await page
      .locator('.sch-results-filters')
      .getByLabel('Class')
      .selectOption({ label: state.className });
    await page
      .locator('.sch-results-filters')
      .getByLabel('Lesson')
      .selectOption(state.cartLessonId);
    const table = page.locator('table.sch-results-table');
    await expect(table.locator('caption')).toContainText('1 of 1 submitted', { timeout: 20_000 });
    const row = table.locator('tbody tr').first();
    await expect.soft(row).toContainText('Submitted');
    // Columns after the name: status, score, points, first try, questions.
    await expect.soft(row.locator('td').nth(1), 'score').toHaveText('5/5');
    if (state.studentPoints)
      await expect.soft(row.locator('td').nth(2), 'points').toHaveText(String(state.studentPoints));
    await expect.soft(row.locator('td').nth(3), 'correct on first try').toHaveText('5/5');
    await capture(page, '12-teacher-results-after');

    // Restore the lesson's earlier scope (it was a whole-school draft before this run).
    await page.goto(`/school/lessons/${state.cartLessonId}`);
    await expect(page.locator('.sch-editor-title h1')).toHaveText(CART, { timeout: 20_000 });
    const scope = page.getByLabel('Who can study this lesson?');
    const before = state.cartScopeBefore ?? 'school';
    if ((await scope.inputValue()) !== before) {
      await scope.selectOption(before);
      await saveLesson(page);
      expect(asked.some((m) => m.includes('This lesson is published.'))).toBe(true);
      await expect(scope).toHaveValue(before);
      await expect(editorStatus(page)).toHaveText('Draft');
    }
  }

  // If flow 5 stopped after saving its lab, take the two added steps back out.
  if (state.motionLessonId && state.motionStepsBefore) {
    await page.goto(`/school/lessons/${state.motionLessonId}`);
    await expect(page.locator('.sch-editor-title h1')).toHaveText(MOTION, { timeout: 20_000 });
    await expect(page.locator('.sch-save-state')).toHaveText('All changes saved');
    const extra = (await steps(page).count()) - state.motionStepsBefore;
    if (extra > 0) {
      for (let i = 0; i < extra; i++)
        await steps(page)
          .last()
          .locator('.sch-step-tools')
          .getByRole('button', { name: 'Remove' })
          .click();
      await saveLesson(page);
    }
    await expect(steps(page)).toHaveCount(state.motionStepsBefore);
  }

  // Remove the test student(s) and class(es); also any left behind by an earlier run.
  await navLink(page, 'Students').click();
  await expect(page.getByRole('heading', { name: 'Students', level: 1 })).toBeVisible();
  const leftovers = page
    .locator('table.sch-roster-table tbody tr')
    .filter({ has: page.locator('code.sch-username', { hasText: USER_PREFIX }) });
  await expect(page.locator('.sch-loading')).toHaveCount(0, { timeout: 20_000 });
  const ownRow = rosterRow(page, state.username);
  if (await ownRow.count()) {
    await capture(page, '12-roster-before-removal');
    const failures = await ownRow.locator('td').nth(2).innerText();
    test.info().annotations.push({ type: 'roster-status-after-wrong-pin', description: failures });
  }
  // Counted so home can be checked against flow 1 even when an earlier run left extras behind.
  let removedStudents = 0;
  let removedClasses = 0;
  for (let guard = 0; guard < 10 && (await leftovers.count()) > 0; guard++) {
    const first = leftovers.first();
    const username = (await first.locator('code.sch-username').innerText()).trim();
    const row = rosterRow(page, username);
    const name = (await row.locator('th').innerText()).trim();
    await row.getByLabel(`More actions for ${name}`).click();
    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(toast(page)).toContainText(`${name} was removed.`, { timeout: 20_000 });
    expect(asked.at(-1)).toContain(`Remove ${name} permanently?`);
    await expect(row).toHaveCount(0, { timeout: 20_000 });
    removedStudents++;
  }
  await expect(leftovers).toHaveCount(0);

  await navLink(page, 'Classes').click();
  await expect(page.getByRole('heading', { name: 'Classes', level: 1 })).toBeVisible();
  for (let guard = 0; guard < 10; guard++) {
    const rows = page.locator('form.sch-class-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    const names = await rows
      .locator('input[name="name"]')
      .evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
    const index = names.findIndex((n) => n.startsWith(NAME_PREFIX));
    if (index < 0) break;
    const name = names[index]!;
    const row = rows.nth(index);
    await expect(row.getByRole('button', { name: 'Remove' })).toBeEnabled({ timeout: 20_000 });
    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(toast(page)).toContainText('Class removed.', { timeout: 20_000 });
    expect(asked.at(-1)).toContain(`Remove the class “${name}”?`);
    await expect.poll(async () => Boolean(await classRow(page, name))).toBe(false);
    removedClasses++;
  }
  expect(await classRow(page, state.className)).toBeNull();
  await capture(page, '12-cleanup-done');

  await navLink(page, 'Home').click();
  if (state.homeCounts) {
    // Flow 1 counted any leftovers; this run added one of each; cleanup removed all of them.
    await expect(statValue(page, 'Students')).toHaveText(
      String(state.homeCounts.students + 1 - removedStudents),
    );
    await expect(statValue(page, 'Classes')).toHaveText(
      String(state.homeCounts.classes + 1 - removedClasses),
    );
  }
  expect(errors).toEqual([]);
});
