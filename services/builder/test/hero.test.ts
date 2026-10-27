import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { GAME_WORLDS } from '@just-imagine/fixtures/browser';
import { CHARACTERS, type BuildWorldJob } from '@just-imagine/protocol';
import { validateScene, LIMITS, type SceneDoc } from '@just-imagine/scene-schema';
import { ensureFriend, ensureHero, heroProblem } from '../src/hero';
import { gameScriptPrompt } from '../src/game-prompt';
import { scenePromptV1 } from '../src/prompts/v1';

const flies = GAME_WORLDS.catchTheFlies;
const job = (description: string, overrides: Partial<BuildWorldJob> = {}): BuildWorldJob => ({
  kind: 'build',
  jobId: 'j_hero',
  worldId: 'w_hero',
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
const withHero = (heroEntityId: string): SceneDoc => ({
  ...flies,
  learning: { ...flies.learning, heroEntityId },
});
const staticId = flies.entities.find((e) => e.body.isStatic)!.id;
const withStaticHero = withHero(staticId);

describe('hero rule', () => {
  it('accepts a dynamic sprite hero and rejects a static or missing one', () => {
    expect(heroProblem(flies)).toBeNull();
    expect(heroProblem(withStaticHero)).toMatch(/static|ground/);
    expect(heroProblem(withHero('nobody'))).toMatch(/missing/);
  });

  it('inserts the companion as the hero when the scene has none and the job names a companion', () => {
    for (const bad of [withStaticHero, withHero('nobody')]) {
      const doc = ensureHero(bad, job('catch apples', { companionId: 'mishti' }));
      expect(doc.learning.heroEntityId).toBe('mishti');
      const hero = doc.entities.find((e) => e.id === 'mishti');
      expect(hero).toMatchObject({
        kind: 'sprite',
        tags: ['hero', 'mishti'],
        description: CHARACTERS.mishti.look,
      });
      expect(hero?.character).toBeUndefined();
      expect(validateScene(doc).ok).toBe(true);
    }
  });

  it('leaves a good scene untouched and a bad one without a companion untouched', () => {
    expect(ensureHero(flies, job('x', { companionId: 'mishti' }))).toBe(flies);
    expect(ensureHero(withStaticHero, job('x'))).toBe(withStaticHero);
  });

  it('never exceeds the entity limit: points at an existing actor instead', () => {
    const actor = flies.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic)!;
    const full: SceneDoc = {
      ...withStaticHero,
      entities: [
        ...flies.entities,
        ...Array.from({ length: LIMITS.maxEntities - flies.entities.length }, (_, i) => ({
          ...actor,
          id: `extra${i}`,
          tags: [],
        })),
      ],
    };
    const doc = ensureHero(full, job('x', { companionId: 'chandni' }));
    expect(doc.entities).toHaveLength(LIMITS.maxEntities);
    expect(doc.learning.heroEntityId).toBe(
      flies.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic)!.id,
    );
  });

  it('numbers the id when the companion id is already taken', () => {
    const taken = structuredClone(withStaticHero);
    taken.entities.push({
      ...structuredClone(flies.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic)!),
      id: 'mishti',
      tags: ['mishti_prop'],
    });
    const doc = ensureHero(taken, job('x', { companionId: 'mishti' }));
    const hero = doc.entities.find((e) => e.id === 'mishti_2');
    expect(hero?.tags).toEqual(['hero', 'mishti']);
    expect(doc.learning.heroEntityId).toBe('mishti_2');
    expect(heroProblem(doc)).toBeNull();
  });

  it('tells the scene model the companion look', () => {
    expect(scenePromptV1(job('x', { companionId: 'bhombol' }))).toContain(CHARACTERS.bhombol.look);
    expect(scenePromptV1(job('x'))).not.toContain(CHARACTERS.bhombol.look);
  });

  it('never tells the scene model the companion look for a Lab', () => {
    const lab = scenePromptV1(
      job('a launch experiment', { tier: 'lab', labKind: 'projectile', companionId: 'bhombol' }),
    );
    expect(lab).not.toContain(CHARACTERS.bhombol.look);
    expect(lab).not.toContain("the hero is the child's friend");
  });
});

describe('the friend always joins', () => {
  const ground = flies.entities.find((e) => e.kind === 'ground')!;
  const heroEntity = flies.entities.find((e) => e.id === flies.learning.heroEntityId)!;
  it('inserts the friend beside a named hero, on the ground, without hero or character', () => {
    const doc = ensureFriend(flies, job('a car race', { companionId: 'bhombol' }));
    const friend = doc.entities.find((e) => e.id === 'bhombol')!;
    expect(friend).toMatchObject({
      kind: 'sprite',
      name: CHARACTERS.bhombol.displayName,
      description: CHARACTERS.bhombol.look,
      tags: ['friend', 'bhombol'],
    });
    expect(friend.character).toBeUndefined();
    expect(friend.body.isStatic).toBe(false);
    expect(Math.abs(friend.transform.x - heroEntity.transform.x)).toBeCloseTo(1.5, 5);
    expect(friend.transform.y).toBeCloseTo(
      ground.transform.y - ground.body.size.height / 2 - 0.5,
      5,
    );
    expect(doc.learning.heroEntityId).toBe(flies.learning.heroEntityId);
    expect(validateScene(doc).ok).toBe(true);
  });

  it('skips a slot blocked by a static wall, and keeps the spacing near an edge', () => {
    const heroX = heroEntity.transform.x;
    const wall = {
      ...structuredClone(heroEntity),
      id: 'wall',
      tags: ['wall'],
      body: { ...heroEntity.body, isStatic: true, size: { width: 1, height: 3 } },
      transform: { x: heroX - 1.5, y: heroEntity.transform.y, rotation: 0 },
    };
    const walled: SceneDoc = { ...flies, entities: [...flies.entities, wall] };
    const friend = ensureFriend(walled, job('x', { companionId: 'bhombol' })).entities.find(
      (e) => e.id === 'bhombol',
    )!;
    expect(friend.transform.x).toBeCloseTo(heroX + 1.5, 5);
    const nearRight: SceneDoc = {
      ...flies,
      entities: flies.entities.map((e) =>
        e.id === heroEntity.id ? { ...e, transform: { ...e.transform, x: 15 } } : e,
      ),
    };
    const edge = ensureFriend(nearRight, job('x', { companionId: 'bhombol' })).entities.find(
      (e) => e.id === 'bhombol',
    )!;
    expect(edge.transform.x).toBeCloseTo(13.5, 5);
  });

  it('leaves a scene that already has the friend unchanged (by id or by tag)', () => {
    const byId = ensureFriend(flies, job('x', { companionId: 'bhombol' }));
    expect(ensureFriend(byId, job('x', { companionId: 'bhombol' }))).toBe(byId);
    const byTag = ensureHero(withStaticHero, job('x', { companionId: 'mishti' }));
    expect(ensureFriend(byTag, job('x', { companionId: 'mishti' }))).toBe(byTag);
  });

  it('skips labs and jobs without a companion', () => {
    expect(ensureFriend(flies, job('x', { companionId: 'bhombol', labKind: 'projectile' }))).toBe(
      flies,
    );
    expect(ensureFriend(flies, job('x', { companionId: 'bhombol', tier: 'lab' }))).toBe(flies);
    expect(ensureFriend(flies, job('x'))).toBe(flies);
  });

  it('skips a full scene and logs friend_insert_skipped', () => {
    const actor = flies.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic)!;
    const full: SceneDoc = {
      ...flies,
      entities: [
        ...flies.entities,
        ...Array.from({ length: LIMITS.maxEntities - flies.entities.length }, (_, i) => ({
          ...actor,
          id: `extra${i}`,
          tags: [],
        })),
      ],
    };
    expect(ensureFriend(full, job('x', { companionId: 'bhombol' }))).toBe(full);
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'friend_insert_skipped',
        jobId: 'j_hero',
        worldId: 'w_hero',
      }),
    );
  });

  it('puts the friend line in the playground scene prompt and not in a lab prompt', () => {
    const line = `The child's friend ${CHARACTERS.bhombol.displayName} is always in this world`;
    const prompt = scenePromptV1(job('x', { companionId: 'bhombol' }));
    expect(prompt).toContain(line);
    expect(prompt).toContain(`tags ["friend","bhombol"]`);
    expect(prompt).toContain(CHARACTERS.bhombol.look);
    const lab = scenePromptV1(
      job('x', { tier: 'lab', labKind: 'projectile', companionId: 'bhombol' }),
    );
    expect(lab).not.toContain(line);
  });

  it('mentions the friend in the script prompt only when a friend entity exists', () => {
    const input = { description: 'x', language: 'en' as const, ageBand: '6-7' };
    const withFriend = gameScriptPrompt({
      ...input,
      doc: ensureFriend(flies, job('x', { companionId: 'bhombol' })),
    });
    expect(withFriend).toContain(
      `The child's friend ${CHARACTERS.bhombol.displayName} (entity "bhombol") is in this world.`,
    );
    expect(withFriend).toContain(
      'Never make the friend an obstacle, a target or something to remove.',
    );
    expect(gameScriptPrompt({ ...input, doc: flies })).not.toContain("The child's friend");
  });
});
