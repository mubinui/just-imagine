import { describe, it, expect } from 'vitest';
import { GAME_WORLDS } from '@just-imagine/fixtures/browser';
import { CHARACTERS, type BuildWorldJob } from '@just-imagine/protocol';
import { validateScene, LIMITS, type SceneDoc } from '@just-imagine/scene-schema';
import { ensureHero, heroProblem } from '../src/hero';
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
