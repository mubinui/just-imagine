import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

// Console layouts with the shipped stylesheets and the markup structure the components render.
// Each case pins one layout rule: nothing wider than its column, and no two framed blocks flush.
const schoolCss = readFileSync(new URL('../app/school.css', import.meta.url), 'utf8');
const adminCss = readFileSync(new URL('../app/admin/admin.css', import.meta.url), 'utf8');
const intro =
  'A cart starts moving when the push exceeds maximum static friction. While moving, net force ' +
  'equals mass times acceleration. This level-floor model uses g = 9.8 m/s² and constant ' +
  'friction coefficients, so the starting threshold and the acceleration can be calculated.';
const chapter = '12. Simple simultaneous equations in two variables';

async function render(page: Page, css: string, body: string, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(`<style>${css}</style>${body}`);
}
async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox();
  expect(b, selector).not.toBeNull();
  return b!;
}
async function gapBelow(page: Page, upper: string, lower: string) {
  const a = await box(page, upper);
  const b = await box(page, lower);
  return b.y - (a.y + a.height);
}

test('a long step preview stays inside the lesson editor', async ({ page }) => {
  await render(
    page,
    schoolCss,
    `<main class="sch-lesson-editor" style="width: 900px">
      <div class="sch-steps-head"><h2>Lesson steps</h2><button>Collapse all steps</button></div>
      <ol class="sch-step-list">
        <li>
          <details class="sch-step" open>
            <summary>
              <span class="sch-step-number">1</span>
              <span class="sch-step-kind">Introduction</span>
              <span class="sch-step-preview">${intro.repeat(3)}</span>
            </summary>
            <div class="sch-step-body"><textarea>${intro}</textarea></div>
          </details>
        </li>
      </ol>
    </main>`,
  );
  const editor = await box(page, '.sch-lesson-editor');
  const step = await box(page, '.sch-step');
  const textarea = await box(page, '.sch-step textarea');
  expect(step.x + step.width).toBeLessThanOrEqual(editor.x + editor.width);
  expect(textarea.x + textarea.width).toBeLessThanOrEqual(editor.x + editor.width);
});

test('lesson editor sections never sit flush against each other', async ({ page }) => {
  await render(
    page,
    schoolCss,
    `<div class="sch sch-panel sch-lesson-editor" style="width: 900px">
      <header class="sch-editor-head"><h1>Force: start the cart</h1></header>
      <details class="sch-section" id="checks" open><summary>Publication checks</summary><p>Saving checks…</p></details>
      <label class="sch-field" id="reason"><span>Reason for the audit log</span><input /></label>
      <section class="sch-panel-card sch-lesson-details" id="details"><label class="sch-field"><span>Title</span><input /></label></section>
      <div class="sch-steps-head" id="steps"><h2>Lesson steps</h2></div>
    </div>`,
  );
  expect(await gapBelow(page, '.sch-editor-head', '#checks')).toBeGreaterThanOrEqual(16);
  expect(await gapBelow(page, '#checks', '#reason')).toBeGreaterThanOrEqual(16);
  expect(await gapBelow(page, '#reason', '#details')).toBeGreaterThanOrEqual(16);
  expect(await gapBelow(page, '#details', '#steps')).toBeGreaterThanOrEqual(16);
  // The first disclosure starts one step below the sticky head, not two.
  expect(await gapBelow(page, '.sch-editor-head', '#checks summary')).toBeLessThanOrEqual(32);
});

test('the chapter select spans the lesson details card so chapter names are readable', async ({
  page,
}) => {
  for (const width of [1180, 1280]) {
    await render(
      page,
      schoolCss,
      `<div class="sch sch-lesson-editor" style="width: ${width - 375}px">
        <section class="sch-panel-card sch-lesson-details">
          <div class="sch-grid sch-lesson-meta">
            <label class="sch-field"><span>Subject</span><select><option>Mathematics</option></select></label>
            <label class="sch-field"><span>Grade</span><select><option>9</option></select></label>
            <label class="sch-field"><span>Write first in</span><select><option>English</option></select></label>
            <label class="sch-field sch-lesson-chapter"><span>Chapter</span><select id="chapter"><option>${chapter}</option></select></label>
          </div>
        </section>
      </div>`,
      width,
    );
    const fits = await page.locator('#chapter').evaluate((select: HTMLSelectElement) => {
      const s = getComputedStyle(select);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const room = select.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      return ctx.measureText(select.selectedOptions[0]!.text).width <= room;
    });
    expect(fits, `chapter name fits at ${width}px`).toBe(true);
    const grid = await box(page, '.sch-lesson-meta');
    expect((await box(page, '.sch-lesson-chapter')).width).toBeCloseTo(grid.width, 0);
  }
});

test('a select too narrow for its value ends it with an ellipsis', async ({ page }) => {
  await render(
    page,
    schoolCss,
    `<div class="sch"><select style="width: 200px"><option>${chapter}</option></select></div>`,
    390,
  );
  expect(await page.locator('select').evaluate((s) => getComputedStyle(s).textOverflow)).toBe(
    'ellipsis',
  );
});

test('the school plan card stands apart from the overview cards above it', async ({ page }) => {
  await render(
    page,
    schoolCss,
    `<div class="sch teacher" style="width: 1040px">
      <div class="sch-overview-grid">
        <section class="sch-panel-card"><h2>Latest student activity</h2></section>
        <div class="sch-overview-side"><section class="sch-panel-card"><h2>Lessons waiting for you</h2></section></div>
      </div>
      <section class="sch-panel-card sch-plans"><h2>School plan</h2></section>
    </div>`,
  );
  expect(await gapBelow(page, '.sch-overview-grid', '.sch-plans')).toBeGreaterThanOrEqual(16);
});

test('the appearance preview starts below the page heading divider', async ({ page }) => {
  await render(
    page,
    adminCss,
    `<div class="adm" style="width: 1040px">
      <div class="adm-heading"><h1>Appearance</h1></div>
      <div class="adm-appearance">
        <section class="adm-section"><h2>Interface palette</h2></section>
        <div class="adm-theme-preview" style="height: 300px">Preview</div>
      </div>
    </div>`,
  );
  expect(await gapBelow(page, '.adm-heading', '.adm-theme-preview')).toBeGreaterThanOrEqual(16);
});
