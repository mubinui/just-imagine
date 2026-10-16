import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { GAME_WORLDS, FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { toGenerated } from '../src/prompts/v1';
import { WORLD_DESIGN_RULES } from '../src/prompts/world-design';
import { imagineGame, wantsGame, guardPatchedGame, type GenerateScript } from '../src/imagine-game';

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
    const script = recorded<unknown>([{ kind: 'game', source: GOOD }]);
    const result = await imagineGame(job('catch the flies before the owl wakes up'), {
      generateScene: scene,
      generateScript: script.fn as GenerateScript,
    });
    expect(result).toMatchObject({ kind: 'game', fallback: false, attempts: 1 });
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
    expect(prompt).not.toContain('catch-the-flies');
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
    });
    expect(result).toMatchObject({ kind: 'game', fallback: false, attempts: 2 });
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
    });
    expect(result.attempts).toBe(2);
    expect(script.prompts[1]).toMatch(/runtime|null|boom/i);
    expect(result.doc.game?.script.source).toBe(GOOD);
  });

  it('reports a failed game instead of publishing an unrelated plain scene', async () => {
    const script = recorded<unknown>([
      { kind: 'game', source: 'eval("1"); game.score(1);' },
      { kind: 'game', source: 'game.say("no goal here");' },
    ]);
    await expect(
      imagineGame(job('catch the flies game'), {
        generateScene: sceneModel(),
        generateScript: script.fn as GenerateScript,
      }),
    ).rejects.toThrow(/goal|score|win/i);
    expect(script.fn).toHaveBeenCalledTimes(2);
  });

  it('reports a failed game when the model is unavailable', async () => {
    const script = vi
      .fn()
      .mockResolvedValueOnce({ nope: true })
      .mockRejectedValueOnce(new Error('model unavailable'));
    await expect(
      imagineGame(job('catch the flies game'), {
        generateScene: sceneModel(),
        generateScript: script,
      }),
    ).rejects.toThrow('model unavailable');
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
    });
    expect(result.attempts).toBe(2);
    expect(script.prompts[1]).toContain('Shh');
    expect(result.doc.game?.script.source).not.toContain('Shh');
  });

  it('does not let the model silently downgrade a requested game', async () => {
    const script = recorded<unknown>([{ kind: 'playground' }, { kind: 'playground' }]);
    await expect(
      imagineGame(job('catch the flies game', { experience: 'game' }), {
        generateScene: sceneModel(),
        generateScript: script.fn as GenerateScript,
      }),
    ).rejects.toThrow('downgrade');
  });

  it('compiles scoreless open play and only bypasses the script model for explicit Labs', async () => {
    const source = "game.on('tap', e => { if(e.target) game.move(e.target.id, {x:8,y:3}); });";
    const script = recorded<unknown>([{ kind: 'game', source }]);
    const play = await imagineGame(job('a garden of talking clouds', { experience: 'freeplay' }), {
      generateScene: sceneModel(sceneOnly(FIXTURE_WORLDS.jellyDragon)),
      generateScript: script.fn as GenerateScript,
    });
    expect(play).toMatchObject({ kind: 'game', attempts: 1, doc: { game: { mode: 'freeplay' } } });
    expect(play.doc.game!.script.source).not.toMatch(/game\.(score|win|lose)/);
    const lab = await imagineGame(
      job('a launch experiment', { tier: 'lab', labKind: 'projectile' }),
      {
        generateScene: sceneModel(sceneOnly(FIXTURE_WORLDS.projectileLab)),
        generateScript: script.fn as GenerateScript,
      },
    );
    expect(lab).toMatchObject({ kind: 'playground', attempts: 0 });
    expect(script.fn).toHaveBeenCalledTimes(1);
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
