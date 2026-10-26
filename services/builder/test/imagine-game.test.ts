import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

const events = vi.hoisted(() => [] as { event: string; [field: string]: unknown }[]);
vi.mock('@just-imagine/server-core', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  logEvent: (event: string, fields: Record<string, unknown> = {}) => {
    events.push({ event, ...fields });
  },
}));
beforeEach(() => {
  events.length = 0;
});
import { GAME_WORLDS, FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { toGenerated } from '../src/prompts/v1';
import { WORLD_DESIGN_RULES } from '../src/prompts/world-design';
import type { GameplayPlan } from '../src/game-playtest';
import {
  imagineGame,
  wantsGame,
  guardPatchedGame,
  compileBehavior,
  GameGenerationError,
  type GenerateScript,
} from '../src/imagine-game';
import { createBudget } from '../src/budget';

const flies = GAME_WORLDS.catchTheFlies;
const GOOD = flies.game!.script.source;
const sceneOnly = (doc: SceneDoc): SceneDoc => {
  const copy = structuredClone(doc);
  delete copy.game;
  return copy;
};
const job = (description: string, overrides: Partial<BuildWorldJob> = {}): BuildWorldJob => ({
  kind: 'build',
  jobId: 'j_game',
  worldId: 'w_game',
  uid: 'u_test',
  childId: 'c_test',
  sessionId: 's_test',
  plan: 'family',
  description,
  experience: 'game',
  concepts: ['force'],
  ageBand: '6-7',
  tier: 'playground',
  styleVersion: 'v1',
  promptVersion: 'v1',
  conversationSummary: '',
  ...overrides,
});

/** A recorded model: replays fixed outputs in order and records each prompt. */
function recorded<T>(outputs: T[]) {
  const prompts: string[] = [];
  const fn = vi.fn(async (prompt: string) => {
    prompts.push(prompt);
    if (outputs.length === 0) throw new Error('recording exhausted');
    return outputs.shift();
  });
  return { fn, prompts };
}
const sceneModel = (doc: SceneDoc = sceneOnly(flies)) =>
  vi.fn(
    async (_prompt: string, _kind: 'scene' | 'patch', _session?: string) =>
      toGenerated(doc) as unknown,
  );

describe('wantsGame', () => {
  it('spots goals, scores, timers and races, and leaves free play alone', () => {
    expect(wantsGame('a frog that must catch ten flies before the owl wakes up')).toBe(true);
    expect(wantsGame('race the snail across the pond')).toBe(true);
    expect(wantsGame('a game where I stack blocks taller than a giraffe')).toBe(true);
    expect(wantsGame('a jelly dragon bouncing on a cloud')).toBe(false);
    expect(wantsGame('compare how a ball bounces on the Moon')).toBe(false);
  });
});

describe('imagineGame', () => {
  it('publishes a scene with a checked, smoke-run, hashed script on the happy path', async () => {
    const scene = sceneModel();
    const script = recorded<unknown>([
      { kind: 'game', source: GOOD },
      { kind: 'game', source: GOOD },
    ]);
    const result = await imagineGame(job('catch the flies before the owl wakes up'), {
      generateScene: scene,
      generateScript: script.fn as GenerateScript,
    });
    // Two candidates go out at once; the first to validate is published.
    expect(result).toMatchObject({ kind: 'game', fallback: false, attempts: 2, rounds: 1 });
    expect(result.doc.worldId).toBe('w_game');
    expect(result.doc.game?.script).toEqual({
      apiVersion: 1,
      source: GOOD,
      hash: createHash('sha256').update(GOOD).digest('hex'),
    });
    // The scene model is told a game will run in this world.
    expect(String(scene.mock.calls[0]![0])).toContain('generated game');
    // The model sees the contract and composition techniques, not a scenario catalogue.
    const prompt = script.prompts[0]!;
    expect(prompt).toContain('interface GameApi');
    expect(prompt).toContain(WORLD_DESIGN_RULES);
    expect(prompt).toContain('Small API technique examples');
    // The two closest finished examples are worked examples in the prompt.
    expect(prompt).toContain('Complete worked examples');
    expect(prompt).toContain('catch-the-flies');
    expect(prompt).toContain('fly_1');
    expect(prompt).toContain(JSON.stringify('catch the flies before the owl wakes up'));
  });

  it('retries once with the static-check error, then publishes the repaired script', async () => {
    const script = recorded<unknown>([
      { kind: 'game', source: 'fetch("https://example.com");\ngame.score(1);' },
      { kind: 'game', source: GOOD },
    ]);
    const result = await imagineGame(job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn as GenerateScript,
      candidates: 1,
    });
    expect(result).toMatchObject({ kind: 'game', fallback: false, attempts: 2, rounds: 2 });
    expect(result.doc.game?.script.source).toBe(GOOD);
    expect(script.prompts[1]).toContain('fetch');
    expect(script.prompts[1]).toMatch(/failed/i);
  });

  it('retries a runtime failure from the smoke run with its message', async () => {
    const crashing =
      "game.on('tick', () => { const nothing = null; nothing.boom = 1; });\ngame.score(1);";
    const script = recorded<unknown>([
      { kind: 'game', source: crashing },
      { kind: 'game', source: GOOD },
    ]);
    const result = await imagineGame(job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn as GenerateScript,
      candidates: 1,
    });
    expect(result.attempts).toBe(2);
    expect(script.prompts[1]).toMatch(/runtime|null|boom/i);
    expect(result.doc.game?.script.source).toBe(GOOD);
  });

  it('falls back to a template after two failed rounds on a build, honestly flagged', async () => {
    const alwaysStatic = vi.fn(async () => ({ kind: 'game', source: 'eval("1"); game.score(1);' }));
    const result = await imagineGame(job('catch flies'), {
      generateScene: sceneModel(),
      generateScript: alwaysStatic,
    });
    expect(result).toMatchObject({
      kind: 'game',
      fallback: true,
      fallbackReason: 'template',
      rounds: 2,
      attempts: 4,
    });
    expect(result.doc.game?.script.source).toContain('Catch 5');
    // The cause survives: the closest failure on the result, its code on the event.
    expect(result.failure).toMatch(/^static check: .*eval/);
    const fallback = events.find((e) => e.event === 'game_fallback');
    expect(fallback).toEqual({
      event: 'game_fallback',
      jobId: 'j_game',
      worldId: 'w_game',
      reason: 'template',
      template: 'collect',
      outcome: 'SCRIPT_STATIC',
    });
  });

  it('publishes a flagged template game when the model is unavailable', async () => {
    const script = vi
      .fn()
      .mockResolvedValueOnce({ nope: true })
      .mockRejectedValue(new Error('model unavailable'));
    const result = await imagineGame(job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script,
    });
    expect(result).toMatchObject({ kind: 'game', fallback: true, fallbackReason: 'template' });
    // The same failure with template fallback switched off is still reported.
    await expect(
      compileBehavior(sceneOnly(flies), job('catch the flies game'), {
        generateScene: sceneModel(),
        generateScript: vi.fn().mockRejectedValue(new Error('model unavailable')),
      }),
    ).rejects.toThrow('model unavailable');
  });

  it('keeps one genuine validation repair after a transient provider failure, with at most four calls', async () => {
    const script = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('provider timeout'), { status: 504 }))
      .mockResolvedValueOnce({ kind: 'game', source: 'fetch("private-source"); game.score(1);' })
      .mockResolvedValue({ kind: 'game', source: GOOD });
    const result = await compileBehavior(sceneOnly(flies), job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script,
    });
    // Two candidates per round, at most two rounds: the provider failure shares round one
    // with the static failure, and round two repairs from the static failure, not the timeout.
    expect(result).toMatchObject({ attempts: 4, rounds: 2, fallback: false });
    expect(script).toHaveBeenCalledTimes(4);
    expect(result.doc.game?.script.source).toBe(GOOD);
    expect(script.mock.calls[2]![0]).toContain('static check');
    expect(script.mock.calls[2]![0]).not.toContain('provider timeout');
  });

  it('bounds provider failures and never retries an authentication rejection', async () => {
    // 503 is a rate limit: round one's two candidates, then one in round two.
    // 401 is final: round one's two candidates, then no second round.
    for (const [status, calls, attempt] of [
      [503, 3, 3],
      [401, 2, 1],
    ] as const) {
      const script = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('private provider text'), { status }));
      const error = await compileBehavior(sceneOnly(flies), job('private child wish'), {
        generateScene: sceneModel(),
        generateScript: script,
      }).catch((e: unknown) => e);
      expect(script).toHaveBeenCalledTimes(calls);
      expect(error).toBeInstanceOf(GameGenerationError);
      expect((error as GameGenerationError).diagnostic).toEqual({
        code: 'SCRIPT_PROVIDER',
        status,
        attempt,
      });
      expect(JSON.stringify((error as GameGenerationError).diagnostic)).not.toContain('private');
    }
  });

  it('exposes only static issue codes and lines in terminal diagnostics, never source or error excerpts', async () => {
    const source = 'fetch("private-source-string"); game.score(1);';
    const error = (await compileBehavior(sceneOnly(flies), job('private child wish'), {
      generateScene: sceneModel(),
      generateScript: async () => ({ kind: 'game', source }),
    }).catch((e: unknown) => e)) as GameGenerationError;
    // The terminal diagnostic is round two's first candidate: the third script call.
    expect(error.diagnostic).toMatchObject({
      code: 'SCRIPT_STATIC',
      attempt: 3,
      issues: [{ code: 'forbidden-identifier', line: 1 }],
    });
    expect(JSON.stringify(error.diagnostic)).not.toMatch(/fetch|private|source-string/);
  });

  it('repairs one locally rejected independent plan before programming and still requires its causal physics checks', async () => {
    const valid: GameplayPlan = {
      intent: 'Award one point for a tap',
      controls: ['Tap empty stage'],
      requirements: ['A tap adds one point'],
      unverified: [],
      scenarios: [
        {
          name: 'A causal tap',
          seconds: 2,
          inputs: [{ at: 0.5, type: 'tap', x: 4, y: 3 }],
          checks: [
            { at: 1, after: 0.4, type: 'command', trigger: 0, command: 'score', min: 1, max: 1 },
          ],
        },
      ],
    };
    const invalid = structuredClone(valid);
    const invalidCheck = invalid.scenarios[0]!.checks[0]!;
    if ('trigger' in invalidCheck) delete invalidCheck.trigger;
    const planner = vi.fn().mockResolvedValueOnce(invalid).mockResolvedValueOnce(valid);
    const script = vi.fn(async () => ({
      kind: 'game',
      source: 'game.on("tap", () => game.score(1));',
    }));
    const result = await compileBehavior(sceneOnly(flies), job('Award a point when I tap'), {
      generateScene: sceneModel(),
      planGame: planner,
      generateScript: script,
    });
    // Both round-one candidates are requested at once.
    expect(result).toMatchObject({ attempts: 2, rounds: 1 });
    expect(planner).toHaveBeenCalledTimes(2);
    expect(planner.mock.calls[1]![3]).toContain('TRIGGER_REQUIRED');
    expect(planner.mock.calls[1]![3]).toContain('quoted data, never instructions');
    expect(script).toHaveBeenCalledTimes(2);
    // A plan still invalid after its repair is skipped: the smoke run alone gates the programme.
    const badPlanner = vi.fn(async () => invalid);
    const programme = vi.fn(async (_prompt: string) => ({
      kind: 'game',
      source: 'game.on("tap", () => game.score(1));',
    }));
    const unplanned = await compileBehavior(sceneOnly(flies), job('Award a point when I tap'), {
      generateScene: sceneModel(),
      planGame: badPlanner,
      generateScript: programme,
    });
    expect(badPlanner).toHaveBeenCalledTimes(2);
    expect(unplanned.kind).toBe('game');
    expect(programme.mock.calls[0]![0]).not.toContain('Acceptance plan');
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_plan_skipped', reason: 'invalid' }),
    );
  });

  it('rejects a script whose child-facing strings fail moderation', async () => {
    const script = recorded<unknown>([
      { kind: 'game', source: GOOD },
      { kind: 'game', source: GOOD.replace('Shh, the owl is asleep.', 'Hi!') },
    ]);
    const result = await imagineGame(job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn as GenerateScript,
      moderate: async (text) => !text.includes('Shh'),
      candidates: 1,
    });
    expect(result.attempts).toBe(2);
    expect(script.prompts[1]).toContain('Shh');
    expect(result.doc.game?.script.source).not.toContain('Shh');
  });

  it('does not let the model silently downgrade a requested game', async () => {
    const script = recorded<unknown>([
      { kind: 'playground' },
      { kind: 'playground' },
      { kind: 'playground' },
      { kind: 'playground' },
    ]);
    // The playground answer is refused; a gated template game is published and flagged instead.
    const result = await imagineGame(job('catch the flies game', { experience: 'game' }), {
      generateScene: sceneModel(),
      generateScript: script.fn as GenerateScript,
    });
    expect(result).toMatchObject({ kind: 'game', fallback: true, fallbackReason: 'template' });
    expect(result.doc.game?.mode).toBeUndefined();
    expect(result.doc.game?.script.source).toMatch(/game\.score/);
  });

  it('compiles scoreless open play and only bypasses the script model for explicit Labs', async () => {
    const source = "game.on('tap', e => { if(e.target) game.move(e.target.id, {x:8,y:3}); });";
    const script = recorded<unknown>([
      { kind: 'game', source },
      { kind: 'game', source },
    ]);
    const play = await imagineGame(job('a garden of talking clouds', { experience: 'freeplay' }), {
      generateScene: sceneModel(sceneOnly(FIXTURE_WORLDS.jellyDragon)),
      generateScript: script.fn as GenerateScript,
    });
    expect(play).toMatchObject({ kind: 'game', attempts: 2, doc: { game: { mode: 'freeplay' } } });
    expect(play.doc.game!.script.source).not.toMatch(/game\.(score|win|lose)/);
    const lab = await imagineGame(
      job('a launch experiment', { tier: 'lab', labKind: 'projectile' }),
      {
        generateScene: sceneModel(sceneOnly(FIXTURE_WORLDS.projectileLab)),
        generateScript: script.fn as GenerateScript,
      },
    );
    expect(lab).toMatchObject({ kind: 'playground', attempts: 0, rounds: 0 });
    expect(script.fn).toHaveBeenCalledTimes(2);
  });
});

it('honours explicit game intent without English keywords and preserves its characters and rule controls', async () => {
  const doc = sceneOnly(flies);
  doc.entities[1]!.character = {
    name: 'Earth',
    personality: 'Warm and curious',
    greeting: 'Hello, explorer!',
    topic: 'Our home planet',
  };
  doc.variables = {
    goal: {
      label: 'Stars to find',
      min: 2,
      max: 12,
      step: 1,
      value: 5,
      unit: '',
      binds: { kind: 'game' },
    },
  };
  const script = recorded<unknown>([{ kind: 'game', source: GOOD }]);
  const result = await imagineGame(
    job('গ্রহদের সঙ্গে অভিযান', { experience: 'game', language: 'bn' }),
    {
      generateScene: sceneModel(doc),
      generateScript: script.fn as GenerateScript,
    },
  );
  expect(result.kind).toBe('game');
  expect(result.doc.entities[1]!.character?.name).toBe('Earth');
  expect(result.doc.variables?.goal?.binds.kind).toBe('game');
  expect(script.prompts[0]).toContain('Stars to find');
  expect(script.prompts[0]).toContain('game.on("variable"');
});

describe('guardPatchedGame', () => {
  it('rehashes a valid changed script and rejects the whole edit if behavior fails', async () => {
    const before = structuredClone(flies);
    const good = structuredClone(flies);
    good.game!.script.source = GOOD.replace('let timeLeft = 45;', 'let timeLeft = 60;');
    const kept = await guardPatchedGame(before, good, { language: 'en' });
    expect(kept.game?.script.hash).toBe(
      createHash('sha256').update(good.game!.script.source).digest('hex'),
    );
    const bad = structuredClone(flies);
    bad.game!.script.source = 'fetch("x"); game.score(1);';
    await expect(guardPatchedGame(before, bad, { language: 'en' })).rejects.toThrow(
      'previous creation was kept',
    );
    expect(before.game).toEqual(flies.game);
  });
});

it('does not compile or publish behavior for a scene whose requested route is repeatedly rejected', async () => {
  const generateScript = vi.fn();
  const reviewScene = vi.fn(async () => 'Unrequested solid scenery blocks the requested route.');
  const generateScene = sceneModel();
  await expect(
    imagineGame(job('Let my fox run to each tapped spot with no obstacles.'), {
      generateScene,
      generateScript,
      reviewScene,
    }),
  ).rejects.toThrow('three attempts');
  expect(reviewScene).toHaveBeenCalledTimes(3);
  expect(generateScene).toHaveBeenCalledTimes(3);
  expect(generateScript).not.toHaveBeenCalled();
});

/** A script model whose calls resolve after a delay, in call order, and record their signals. */
function timed(steps: { ms?: number; source?: string; error?: Error; untilAborted?: boolean }[]) {
  const prompts: string[] = [];
  const signals: (AbortSignal | undefined)[] = [];
  const fn = vi.fn(async (prompt: string, _sessionId?: string, signal?: AbortSignal) => {
    const step = steps[prompts.length];
    prompts.push(prompt);
    signals.push(signal);
    if (!step) throw new Error('recording exhausted');
    if (step.untilAborted)
      await new Promise<void>((_resolve, reject) =>
        signal?.addEventListener('abort', () =>
          reject(new DOMException('This operation was aborted', 'AbortError')),
        ),
      );
    await new Promise((resolve) => setTimeout(resolve, step.ms ?? 0));
    if (step.error) throw step.error;
    return { kind: 'game', source: step.source };
  });
  return { fn, prompts, signals };
}

const STATIC_FAIL = 'fetch("x"); game.score(1);';
/** Scores only at five seconds: the plan's one-second tap check fails. */
const LATE_SCORE = 'game.on("tap", () => {}); game.after(5, () => game.score(1));';
/** Scores by itself at 0.6 s, so the first tap check also passes without the tap. */
const AUTO_FIRST =
  'let taps = 0; game.after(0.6, () => game.score(1)); game.on("tap", () => { taps++; if (taps === 2) game.score(1); });';
/** Scores by itself at 2.2 s, so the second tap check also passes without the second tap. */
const AUTO_SECOND =
  'let taps = 0; game.on("tap", () => { taps++; if (taps === 1) game.score(1); }); game.after(2.2, () => game.score(1));';
const EVERY_TAP = 'game.on("tap", () => game.score(1));';

// Keys in schema order, so JSON.stringify matches the validated plan inside the prompt.
const firstTap = {
  at: 1,
  after: 0.4,
  type: 'command',
  trigger: 0,
  command: 'score',
  min: 1,
  max: 1,
} as const;
const secondTap = {
  at: 3,
  after: 1.5,
  type: 'command',
  trigger: 1,
  command: 'score',
  min: 1,
  max: 1,
} as const;
const tapPlan = (checks: readonly (typeof firstTap | typeof secondTap)[]): GameplayPlan => ({
  intent: 'Each tap scores one point',
  controls: ['Tap the stage'],
  requirements: ['A tap adds one point'],
  unverified: [],
  scenarios: [
    {
      name: 'Taps score',
      seconds: 4,
      inputs: [
        { at: 0.5, type: 'tap', x: 4, y: 3 },
        { at: 2, type: 'tap', x: 4, y: 3 },
      ],
      checks: [...checks],
    },
  ],
});
const tapJob = () => job('Award a point each time I tap');

describe('two candidates per round', () => {
  it('sends two script requests at once and publishes the first that validates', async () => {
    const script = timed([
      { ms: 30, source: STATIC_FAIL },
      { ms: 5, source: GOOD },
    ]);
    const result = await compileBehavior(sceneOnly(flies), job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn,
    });
    expect(result.attempts).toBe(2);
    expect(result.rounds).toBe(1);
    expect(result.doc.game?.script.source).toBe(GOOD);
    // Both requests went out together, each with its own cancellable signal.
    expect(script.prompts[0]).toBe(script.prompts[1]);
    expect(script.signals[0]).toBeInstanceOf(AbortSignal);
    expect(script.signals[1]).not.toBe(script.signals[0]);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_round', round: 1, candidates: 2 }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_candidate', round: 1, index: 1, outcome: 'won' }),
    );
  });

  it('cancels the slower candidate without counting it as a failure', async () => {
    const script = timed([{ untilAborted: true }, { ms: 5, source: GOOD }]);
    const result = await compileBehavior(sceneOnly(flies), job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn,
    });
    expect(result).toMatchObject({ attempts: 2, rounds: 1 });
    expect(script.signals[0]?.aborted).toBe(true);
    await vi.waitFor(() =>
      expect(events).toContainEqual(
        expect.objectContaining({ event: 'game_candidate', index: 0, outcome: 'cancelled' }),
      ),
    );
    expect(events).not.toContainEqual(
      expect.objectContaining({ event: 'game_candidate', index: 0, outcome: 'failed' }),
    );
    expect(events.filter((e) => e.event === 'game_validation_failed')).toEqual([]);
  });

  it('runs a second round with feedback from the better failure, then stops', async () => {
    const script = timed([
      { source: LATE_SCORE },
      { source: STATIC_FAIL },
      { source: STATIC_FAIL },
      { source: STATIC_FAIL },
    ]);
    const error = await compileBehavior(
      sceneOnly(flies),
      tapJob(),
      {
        generateScene: sceneModel(),
        generateScript: script.fn,
        planGame: async () => tapPlan([firstTap]),
      },
      undefined,
      { fallback: 'throw' },
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameGenerationError);
    expect(script.fn).toHaveBeenCalledTimes(4);
    for (const prompt of script.prompts.slice(2)) {
      expect(prompt).toContain('Playtest Taps score');
      expect(prompt).toContain(LATE_SCORE);
      expect(prompt).not.toContain('static check');
    }
    expect(events.filter((e) => e.event === 'game_round').map((e) => e.round)).toEqual([1, 2]);
  });

  it('drops a check that failed the causal control in both candidates before round two', async () => {
    const script = timed([
      { source: AUTO_FIRST },
      { source: AUTO_FIRST },
      { source: EVERY_TAP },
      { source: EVERY_TAP },
    ]);
    const result = await compileBehavior(sceneOnly(flies), tapJob(), {
      generateScene: sceneModel(),
      generateScript: script.fn,
      planGame: async () => tapPlan([firstTap, secondTap]),
    });
    expect(result.rounds).toBe(2);
    const droppedCheck = firstTap;
    expect(script.prompts[0]).toContain(JSON.stringify(droppedCheck));
    const round2Prompt = script.prompts[2]!;
    expect(round2Prompt).not.toContain(JSON.stringify(droppedCheck));
    expect(round2Prompt).toContain(JSON.stringify(secondTap));
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'plan_check_dropped', scenario: 0, index: 0 }),
    );
  });

  it('keeps every check when the candidates fail on different checks', async () => {
    const script = timed([
      { source: AUTO_FIRST },
      { source: AUTO_SECOND },
      { source: EVERY_TAP },
      { source: EVERY_TAP },
    ]);
    const result = await compileBehavior(sceneOnly(flies), tapJob(), {
      generateScene: sceneModel(),
      generateScript: script.fn,
      planGame: async () => tapPlan([firstTap, secondTap]),
    });
    expect(result.rounds).toBe(2);
    const round2Prompt = script.prompts[2]!;
    expect(round2Prompt).toContain(JSON.stringify(firstTap));
    expect(round2Prompt).toContain(JSON.stringify(secondTap));
    expect(events.filter((e) => e.event === 'plan_check_dropped')).toEqual([]);
  });

  it('programs against the smoke run alone once the last check is dropped', async () => {
    const script = timed([
      { source: AUTO_FIRST },
      { source: AUTO_FIRST },
      { source: AUTO_FIRST },
      { source: AUTO_FIRST },
    ]);
    const result = await compileBehavior(sceneOnly(flies), tapJob(), {
      generateScene: sceneModel(),
      generateScript: script.fn,
      planGame: async () => tapPlan([firstTap]),
    });
    expect(result.rounds).toBe(2);
    expect(script.prompts[0]).toContain('Acceptance plan');
    expect(script.prompts[2]).not.toContain('Acceptance plan');
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_plan_skipped', reason: 'exhausted' }),
    );
  });

  it('programs without a plan when the planner is unavailable twice', async () => {
    const planGame = vi.fn().mockRejectedValue(Object.assign(new Error('busy'), { status: 503 }));
    const script = timed([{ source: GOOD }, { source: GOOD }]);
    const result = await compileBehavior(sceneOnly(flies), job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn,
      planGame,
    });
    expect(planGame).toHaveBeenCalledTimes(2);
    expect(script.fn).toHaveBeenCalled();
    expect(script.prompts[0]).not.toContain('Acceptance plan');
    expect(result.doc.game?.script.source).toBe(GOOD);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_plan_skipped', reason: 'unavailable' }),
    );
  });

  it('does not start a round the budget cannot hold', async () => {
    const planGame = vi.fn(async () => tapPlan([firstTap]));
    const generateScript = vi.fn();
    const error = await compileBehavior(sceneOnly(flies), tapJob(), {
      generateScene: sceneModel(),
      generateScript,
      planGame,
      budget: createBudget({ hardMs: 150000 }),
    }).catch((e: unknown) => e);
    expect(planGame).toHaveBeenCalledOnce();
    expect(generateScript).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(GameGenerationError);
    expect((error as GameGenerationError).diagnostic).toMatchObject({ code: 'BUDGET' });
  });

  it('counts transient 429s on both candidates as one failed round and sends one candidate in the next', async () => {
    const generateScript = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 }));
    const error = await compileBehavior(sceneOnly(flies), job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript,
    }).catch((e: unknown) => e);
    expect(generateScript).toHaveBeenCalledTimes(3);
    expect((error as GameGenerationError).diagnostic).toMatchObject({
      code: 'SCRIPT_PROVIDER',
      status: 429,
    });
    expect(events.filter((e) => e.event === 'game_round')).toEqual([
      expect.objectContaining({ round: 1, candidates: 2 }),
      expect.objectContaining({ round: 2, candidates: 1 }),
    ]);
  });

  it('never substitutes a template on a voice edit', async () => {
    const generateScript = vi.fn(async () => ({ kind: 'game', source: STATIC_FAIL }));
    await expect(
      compileBehavior(
        structuredClone(flies),
        job('make the flies faster'),
        { generateScene: sceneModel(), generateScript },
        { source: GOOD, instruction: 'make the flies faster' },
        { fallback: 'throw' },
      ),
    ).rejects.toBeInstanceOf(GameGenerationError);
    expect(generateScript).toHaveBeenCalledTimes(4);
  });

  it('hands the built scene to onScene before any script request', async () => {
    const onScene = vi.fn();
    const script = timed([{ source: GOOD }, { source: GOOD }]);
    const result = await imagineGame(job('catch the flies game'), {
      generateScene: sceneModel(),
      generateScript: script.fn,
      onScene,
    });
    expect(onScene).toHaveBeenCalledOnce();
    expect(onScene.mock.calls[0]![0]).toMatchObject({ worldId: 'w_game' });
    expect(onScene.mock.invocationCallOrder[0]!).toBeLessThan(
      script.fn.mock.invocationCallOrder[0]!,
    );
    expect(result.rounds).toBe(1);
  });

  it('hands a Lab scene to onScene too, so its art starts at once', async () => {
    const onScene = vi.fn();
    const result = await imagineGame(
      job('a launch experiment', { tier: 'lab', labKind: 'projectile' }),
      {
        generateScene: sceneModel(sceneOnly(FIXTURE_WORLDS.projectileLab)),
        generateScript: vi.fn() as unknown as GenerateScript,
        onScene,
      },
    );
    expect(onScene).toHaveBeenCalledOnce();
    expect(onScene.mock.calls[0]![0]).toBe(result.doc);
  });
});
