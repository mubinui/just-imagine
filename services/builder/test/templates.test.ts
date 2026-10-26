import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS, GAME_WORLDS, LAB_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { SceneDocSchema, findBlockedTerm, type SceneDoc } from '@just-imagine/scene-schema';
import { gateScript } from '../src/imagine-game';
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
