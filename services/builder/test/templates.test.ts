import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS, GAME_WORLDS, LAB_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { SceneDocSchema, findBlockedTerm, type SceneDoc } from '@just-imagine/scene-schema';
import { driveScript, type TimedInput } from '@just-imagine/game-runtime';
import { createEngineStage, nodeWorkerFactory } from '@just-imagine/game-runtime/node';
import { gateScript } from '../src/imagine-game';
import { ensureFriend } from '../src/hero';
import {
  ALL_TEMPLATE_STRINGS,
  chooseTemplate,
  templateGame,
  templateSource,
} from '../src/templates';

const sceneOnly = (doc: SceneDoc): SceneDoc => {
  const copy = structuredClone(doc);
  delete copy.game;
  return copy;
};

const recorded = ['game-quality-planets', 'game-quality-portal'].map(
  (name) =>
    [
      name,
      SceneDocSchema.parse(
        JSON.parse(readFileSync(new URL(`./recordings/${name}.json`, import.meta.url), 'utf8')).doc,
      ),
    ] as const,
);

const flies = sceneOnly(GAME_WORLDS.catchTheFlies);
/** The frog alone on the meadow, with only a static owl for company. */
const loneHero: SceneDoc = {
  ...flies,
  entities: flies.entities.filter((e) => !e.tags.includes('fly')),
};

/** Plays exact inputs against the real engine and returns every command with its time. */
async function play(doc: SceneDoc, source: string, playback: TimedInput[], seconds = 3) {
  const commands: { time: number; type: string; target?: string; x?: number; y?: number }[] = [];
  const result = await driveScript(source, await createEngineStage(doc), {
    seconds,
    requireGoal: false,
    seed: doc.environment.seed,
    worker: nodeWorkerFactory,
    playback,
    onFrame(time, _state, frame) {
      for (const c of frame) commands.push({ time, ...(c as object) } as (typeof commands)[number]);
    },
  });
  expect(result.ok).toBe(true);
  return commands;
}

const job = (description: string, overrides: Partial<BuildWorldJob> = {}): BuildWorldJob => ({
  kind: 'build',
  jobId: 'j_template',
  worldId: 'w_template',
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

describe.each([
  ...Object.entries(FIXTURE_WORLDS),
  ...Object.entries(LAB_WORLDS),
  ...Object.entries(GAME_WORLDS),
  ...recorded,
])('template on %s', (_key, doc) => {
  it.each(['collect', 'tap-toy'] as const)(
    '%s passes the gate in game mode when choosable, and tap-toy in freeplay',
    async (kind) => {
      const scene = sceneOnly(doc);
      if (kind === 'collect' && chooseTemplate(scene, 'game') !== 'collect') return;
      expect(
        await gateScript(scene, templateSource(kind, scene, 'en', 'game'), {
          language: 'en',
          requireGoal: true,
        }),
      ).toBeNull();
      expect(
        await gateScript(scene, templateSource(kind, scene, 'bn', 'freeplay'), {
          language: 'bn',
          requireGoal: false,
        }),
      ).toBeNull();
    },
  );
});

describe('chooseTemplate', () => {
  it('never picks collect for a lone hero on the ground', () => {
    expect(chooseTemplate(loneHero, 'game')).toBe('tap-toy');
    expect(chooseTemplate(loneHero, 'freeplay', 'catch the stars')).toBe('tap-toy');
  });

  it('picks collect for a game, or for a catching wish in free play, when there is something to catch', () => {
    expect(chooseTemplate(flies, 'game')).toBe('collect');
    expect(chooseTemplate(flies, 'freeplay', 'gather the flies')).toBe('collect');
    expect(chooseTemplate(flies, 'freeplay', 'a sleepy meadow')).toBe('tap-toy');
  });
});

describe('templateSource', () => {
  it('mirrors the target name in child words', () => {
    expect(templateSource('collect', flies, 'en', 'game')).toContain('Catch 5 flies!');
    expect(templateSource('collect', flies, 'en', 'game')).toContain('or tap a fly!');
    expect(templateSource('collect', flies, 'bn', 'game')).toContain('৫টা fly ধরো!');
  });

  it('says "things" when the targets have no shared name', () => {
    const mixed = structuredClone(flies);
    mixed.entities.forEach((e, i) => {
      if (e.tags.includes('fly')) e.name = `bug ${i}`;
    });
    expect(templateSource('collect', mixed, 'en', 'game')).toContain('Catch 5 things!');
  });

  it('every fixed string passes the blocklist', () => {
    expect(ALL_TEMPLATE_STRINGS.length).toBeGreaterThanOrEqual(12);
    for (const s of ALL_TEMPLATE_STRINGS) expect(findBlockedTerm(s)).toBeNull();
  });
});

describe('tap toy', () => {
  it('answers a tap on empty stage with a sound, a sparkle and a nudge', async () => {
    const scene = sceneOnly(FIXTURE_WORLDS.jellyDragon);
    for (const mode of ['game', 'freeplay'] as const) {
      const after = (
        await play(scene, templateSource('tap-toy', scene, 'en', mode), [
          { at: 0.5, type: 'tap', x: 14, y: 2 },
          { at: 1.5, type: 'tap', x: 2, y: 6 },
        ])
      ).filter((c) => c.time >= 1.5);
      expect(after).toContainEqual(expect.objectContaining({ type: 'sound' }));
      expect(after).toContainEqual(expect.objectContaining({ type: 'celebrate' }));
      expect(after).toContainEqual(expect.objectContaining({ type: 'impulse' }));
    }
  });
});

describe('tap toy progress', () => {
  it('shows the count on the HUD from the first counted tap in game mode', async () => {
    const scene = sceneOnly(FIXTURE_WORLDS.jellyDragon);
    const hero = scene.learning.heroEntityId;
    const others = scene.entities.filter(
      (e) => e.kind === 'sprite' && !e.body.isStatic && e.id !== hero,
    );
    const counted = others.length > 0 ? others : scene.entities.filter((e) => e.id === hero);
    const target = counted[0]!;
    const huds = (
      await play(
        scene,
        templateSource('tap-toy', scene, 'en', 'game'),
        [0.5, 0.6, 0.7].map((at) => ({ at, type: 'tap' as const, target: target.id })),
      )
    ).filter((c) => c.type === 'hud') as unknown as { score?: number; label?: string }[];
    expect(huds.map((h) => h.score)).toEqual([0, 1, 2, 3]);
    for (const h of huds) expect(h.label).toBe('Tap 10 things!');
  });
});

describe('collect hop', () => {
  it('never pushes the hero upward in space, where the engine has no gravity', async () => {
    const scene = sceneOnly(FIXTURE_WORLDS.moonBounce);
    scene.environment.medium = 'space';
    const hero = scene.learning.heroEntityId;
    const y = scene.entities.find((e) => e.id === hero)!.transform.y;
    const hops = (
      await play(scene, templateSource('collect', scene, 'en', 'game'), [
        { at: 0.5, type: 'tap', x: 12, y },
        { at: 0.6, type: 'tap', x: 2, y },
      ])
    ).filter((c) => c.type === 'impulse' && c.target === hero);
    expect(hops).toHaveLength(2);
    for (const hop of hops) expect(hop.y).toBeGreaterThanOrEqual(0);
  });

  it('only hops upward when the hero has settled, so rapid taps cannot launch it', async () => {
    const hero = flies.learning.heroEntityId;
    const taps: TimedInput[] = [0.5, 0.55, 0.6, 0.65, 0.7].map((at) => ({
      at,
      type: 'tap',
      x: 6,
      y: 8,
    }));
    const hops = (await play(flies, templateSource('collect', flies, 'en', 'game'), taps)).filter(
      (c) => c.type === 'impulse' && c.target === hero,
    );
    expect(hops).toHaveLength(5);
    expect(hops[0]!.y).toBe(-3);
    expect(hops.slice(1).every((hop) => hop.y === 0)).toBe(true);
  });
});

describe('templateGame', () => {
  it('publishes the chosen template as a checked game', async () => {
    const result = await templateGame(flies, job('catch the flies'), undefined, {});
    expect(result.kind).toBe('collect');
    expect(result.doc.game?.script.source).toContain('Catch 5 flies!');
    expect(result.doc.game?.mode).toBeUndefined();
  });

  it('falls to the tap toy, then to the tap toy in free play, when the gate rejects', async () => {
    const toy = await templateGame(flies, job('catch the flies'), undefined, {
      moderate: async (text) => !text.includes('Catch'),
    });
    expect(toy.kind).toBe('tap-toy');
    expect(toy.doc.game?.mode).toBeUndefined();
    const floor = await templateGame(flies, job('catch the flies'), undefined, {
      moderate: async (text) => !/Catch|Tap 10/.test(text),
    });
    expect(floor.kind).toBe('tap-toy');
    expect(floor.doc.game?.mode).toBe('freeplay');
    await expect(
      templateGame(flies, job('catch the flies'), undefined, { moderate: async () => false }),
    ).rejects.toThrow();
  });
});

describe('the friend in template games', () => {
  const withFriend = (doc: SceneDoc): SceneDoc =>
    ensureFriend(doc, job('x', { companionId: 'bhombol' }));
  const fliesFriend = withFriend(flies);
  const loneFriend = withFriend({
    ...flies,
    entities: flies.entities.map((e) =>
      e.tags.includes('fly') ? { ...e, body: { ...e.body, isStatic: true } } : e,
    ),
  });

  it('puts the friend in the scenes', () => {
    expect(fliesFriend.entities.some((e) => e.tags.includes('friend'))).toBe(true);
    expect(loneFriend.entities.some((e) => e.tags.includes('friend'))).toBe(true);
  });

  it('chooses the tap toy for hero + friend + static ground, and collect when a real target exists', () => {
    expect(chooseTemplate(loneFriend, 'game')).toBe('tap-toy');
    expect(chooseTemplate(loneFriend, 'freeplay', 'catch the stars')).toBe('tap-toy');
    expect(chooseTemplate(fliesFriend, 'game')).toBe('collect');
  });

  it('collect never lists, removes or scores the friend', async () => {
    const source = templateSource('collect', fliesFriend, 'en', 'game');
    expect(source).not.toContain('"bhombol"');
    const commands = await play(
      fliesFriend,
      source,
      [{ at: 0.5, type: 'tap', target: 'bhombol' } as unknown as TimedInput],
      2,
    );
    expect(commands.some((c) => c.type === 'remove' && c.target === 'bhombol')).toBe(false);
    expect(commands.some((c) => c.type === 'score')).toBe(false);
  });

  it('tap toy lets the friend hop but never counts it, and the gate passes', async () => {
    expect(templateSource('tap-toy', loneFriend, 'en', 'game')).toContain(
      'const COUNT_HERO = true;',
    );
    for (const doc of [loneFriend, fliesFriend]) {
      expect(
        await gateScript(doc, templateSource('tap-toy', doc, 'en', 'game'), {
          language: 'en',
          requireGoal: true,
        }),
      ).toBeNull();
    }
    const commands = await play(
      loneFriend,
      templateSource('tap-toy', loneFriend, 'en', 'game'),
      Array.from({ length: 12 }, (_, i) => ({
        at: 0.3 + i * 0.1,
        type: 'tap',
        target: 'bhombol',
      })) as unknown as TimedInput[],
      3,
    );
    expect(commands.some((c) => c.type === 'impulse' && c.target === 'bhombol')).toBe(true);
    expect(commands.some((c) => c.type === 'score')).toBe(false);
  });

  it('tap toy never picks the friend as the toy to copy', () => {
    const scene = withFriend({
      ...flies,
      entities: flies.entities.map((e) =>
        e.kind === 'sprite' ? { ...e, body: { ...e.body, isStatic: true } } : e,
      ),
    });
    const friend = scene.entities.find((e) => e.tags.includes('friend'))!;
    friend.body = { ...friend.body, isStatic: false };
    const source = templateSource('tap-toy', scene, 'en', 'game');
    expect(source).not.toContain(`game.spawn(${JSON.stringify(friend.id)}`);
    expect(source).toContain('game.spawn(');
  });
});
