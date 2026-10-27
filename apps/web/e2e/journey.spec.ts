import { test, expect, type Page, type WebSocketRoute } from '@playwright/test';
import { catchAFly } from './catch-the-flies';

// The fake gateway's canned timeline replays a build of the starting preview world on every call.
const CANNED_WORLD = 'w_fixture_jelly_dragon';

interface WorldJob {
  type: 'worldJob';
  worldId: string;
  status: string;
}

/**
 * Passes the Studio's voice socket through to the fake gateway and keeps what the gateway says.
 * The fake gateway cannot hear speech, so the child's spoken wish reaches it as the same `text`
 * message the Studio's Write box sends.
 */
async function gatewayLine(page: Page) {
  const line: { server?: WebSocketRoute; jobs: WorldJob[] } = { jobs: [] };
  await page.routeWebSocket(/:8787/, (socket) => {
    const server = socket.connectToServer();
    line.server = server;
    server.onMessage((message) => {
      if (typeof message === 'string') {
        const parsed = JSON.parse(message) as { type: string };
        if (parsed.type === 'worldJob' && (parsed as WorldJob).worldId !== CANNED_WORLD)
          line.jobs.push(parsed as WorldJob);
      }
      socket.send(message);
    });
  });
  return {
    jobs: line.jobs,
    say(text: string) {
      line.server!.send(JSON.stringify({ type: 'text', text }));
    },
  };
}

type Watched = Window & { __building?: Promise<boolean> };

/**
 * Installs, and waits for, an observer of every DOM change, because a scripted build passes in
 * moments; the returned check resolves true once the stage showed the generation show for a new
 * world while the header said it was building. Install it before the wish is sent.
 */
async function watchForBuilding(page: Page): Promise<() => Promise<boolean>> {
  await page.evaluate(() => {
    (window as Watched).__building = new Promise<boolean>((resolve) => {
      const seen = () =>
        document.querySelector('.stage-status[data-state="building"]') &&
        document.querySelector('.stage-world .show');
      const observer = new MutationObserver(() => {
        if (!seen()) return;
        observer.disconnect();
        resolve(true);
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(Boolean(seen()));
      }, 3000);
    });
  });
  return () => page.evaluate(() => (window as Watched).__building!);
}

/** Opens the Studio as Ari with the voice live, and returns the talk button. */
async function liveStudio(page: Page) {
  await page.goto('/play');
  await page.getByRole('button', { name: 'Ari Ages 8-10' }).click();
  await expect(page).toHaveURL(/studio/);
  await expect(page.locator('canvas')).toBeVisible();
  const talk = page.locator('.studio-dock .talk');
  await page
    .getByRole('button', { name: /^Talk to / })
    .first()
    .click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  await expect(talk).toHaveClass(/is-live/);
  return talk;
}

test('a child asks for a game, waits, the voice stops, and the game is playable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const gateway = await gatewayLine(page);
  const talk = await liveStudio(page);

  const building = await watchForBuilding(page);
  gateway.say('a game where a frog catches flies');
  expect(await building()).toBe(true);

  // The world the child asked for is ready: the friend stops and the game takes over.
  await expect(talk).not.toHaveClass(/is-live/, { timeout: 2000 });
  await expect(page.locator('.stage-status')).toContainText('Voice off');
  const built = gateway.jobs.find((job) => job.status === 'queued')!.worldId;
  expect(gateway.jobs.map((job) => [job.worldId, job.status])).toEqual([
    [built, 'queued'],
    [built, 'placeholders'],
    [built, 'ready'],
  ]);
  await expect(page.locator('.stage-title')).toHaveText('Catch the Flies');
  await expect(page.locator('.game-score-value')).toHaveText('0', { timeout: 2000 });

  const ask = page.getByRole('dialog', { name: 'How many flies can you catch?' });
  await expect(ask).toBeVisible({ timeout: 15000 });
  await ask.getByRole('button', { name: 'Five' }).click();
  await expect(ask).toHaveCount(0);
  await catchAFly(page);
  await page.screenshot({ path: 'test-results/journey-game.png' });

  // A voice edit of the game re-runs queued to ready for the same world; the friend keeps listening.
  await talk.click();
  await expect(page.locator('.stage-status')).toHaveAttribute('data-state', 'connected');
  const before = gateway.jobs.length;
  gateway.say('make the flies faster');
  await expect
    .poll(() => gateway.jobs.slice(before).map((job) => [job.worldId, job.status]))
    .toEqual([
      [built, 'queued'],
      [built, 'placeholders'],
      [built, 'ready'],
    ]);
  await page.waitForTimeout(300);
  await expect(talk).toHaveClass(/is-live/);
  await expect(page.locator('.stage-title')).toHaveText('Catch the Flies');
  await expect(page.locator('.game-score-value')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a simpler fallback game opens with the voice still on, so the friend can explain it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const gateway = await gatewayLine(page);
  const talk = await liveStudio(page);

  const building = await watchForBuilding(page);
  gateway.say('a simpler game where a frog catches flies');
  expect(await building()).toBe(true);
  await expect
    .poll(() => gateway.jobs.map((job) => job.status))
    .toEqual(['queued', 'placeholders', 'ready']);
  // The fallback world is selected and playable, and the friend keeps talking.
  await expect(page.locator('.stage-title')).toHaveText('Catch the Flies');
  await expect(page.locator('.game-score-value')).toBeVisible({ timeout: 2000 });
  await page.waitForTimeout(300);
  await expect(talk).toHaveClass(/is-live/);
  await expect(page.locator('.stage-status')).not.toContainText('Voice off');
  expect(errors).toEqual([]);
});
