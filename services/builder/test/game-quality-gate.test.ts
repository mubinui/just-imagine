import { it, expect, vi } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { compileBehavior } from '../src/imagine-game';
import type { GameplayPlan } from '../src/game-playtest';

const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
doc.environment.gravity = { x: 0, y: 0 };
doc.entities.find((e) => e.id === 'ball')!.body.isStatic = true;
const job: BuildWorldJob = {
  kind: 'build',
  jobId: 'j_quality',
  worldId: doc.worldId,
  uid: 'u_test',
  childId: 'c_test',
  sessionId: 's_test',
  plan: 'family',
  description: 'A movable ball',
  childRequest: 'Move to my tap. No score or ending.',
  experience: 'freeplay',
  concepts: ['force'],
  ageBand: '6-7',
  tier: 'playground',
  styleVersion: 'v1',
  promptVersion: 'v1',
  conversationSummary: '',
};
const plan: GameplayPlan = {
  intent: 'Choose the ball destination',
  controls: ['Tap a place'],
  requirements: ['Go to the chosen place', 'No score or ending'],
  unverified: [],
  scenarios: [
    {
      name: 'Destination and rest',
      seconds: 2,
      inputs: [{ at: 0.5, type: 'tap', x: 12, y: 3 }],
      checks: [
        { at: 1.5, type: 'near', trigger: 0, target: 'ball', x: 12, y: 3, tolerance: 0.3 },
        { at: 1.5, type: 'speed', target: 'ball', max: 0.2 },
      ],
    },
  ],
};
const source = "game.on('tap', e => { if(!e.target) game.move('ball',{x:e.x,y:e.y}); });";

it('plans before seeing any new source and repairs a smoke-safe broken mechanic with measured feedback', async () => {
  const order: string[] = [];
  const planGame = vi.fn(async () => {
    order.push('plan');
    return plan;
  });
  const generateScript = vi
    .fn()
    .mockImplementationOnce(async () => {
      order.push('script');
      return { kind: 'game', source: 'game.on("tap", () => game.say("I arrived!"));' };
    })
    .mockImplementationOnce(async () => {
      order.push('repair');
      return { kind: 'game', source };
    });
  const result = await compileBehavior(doc, job, {
    planGame,
    generateScript,
    generateScene: vi.fn(),
  });
  expect(order).toEqual(['plan', 'script', 'repair']);
  expect(planGame).toHaveBeenCalledWith(doc, job, undefined);
  expect(generateScript.mock.calls[1]![0]).toMatch(/Playtest Destination and rest.*position=/);
  expect(generateScript.mock.calls[0]![0]).toContain('No score or ending');
  expect(result).toMatchObject({
    attempts: 2,
    fallback: false,
    doc: { game: { mode: 'freeplay', script: { source } } },
  });
});

it('never publishes or downgrades a persistently unplayable creation', async () => {
  const generateScript = vi.fn(async () => ({ kind: 'game', source: 'game.on("tap", () => {});' }));
  await expect(
    compileBehavior(doc, job, {
      planGame: async () => plan,
      generateScript,
      generateScene: vi.fn(),
    }),
  ).rejects.toThrow(/Playtest.*position=/);
  expect(generateScript).toHaveBeenCalledTimes(2);
  expect(doc.game).toBeUndefined();
});

it('fails closed on invalid or unavailable planning before any script or art is generated', async () => {
  const generateScript = vi.fn();
  for (const planGame of [
    async () => ({ ...plan, scenarios: [] }),
    async () => {
      throw new Error('unavailable');
    },
  ])
    await expect(
      compileBehavior(doc, job, { planGame, generateScript, generateScene: vi.fn() }),
    ).rejects.toThrow(/valid gameplay acceptance plan/);
  expect(generateScript).not.toHaveBeenCalled();
});

it('gives a timed-out or rate-limited planner one more attempt, then plans as usual', async () => {
  for (const transient of [
    Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }),
    Object.assign(new Error('Resource has been exhausted'), { status: 429 }),
  ]) {
    const planGame = vi.fn().mockRejectedValueOnce(transient).mockResolvedValueOnce(plan);
    const generateScript = vi.fn(async () => ({ kind: 'game', source }));
    const result = await compileBehavior(doc, job, {
      planGame,
      generateScript,
      generateScene: vi.fn(),
    });
    expect(planGame).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ fallback: false, doc: { game: { script: { source } } } });
  }
});
