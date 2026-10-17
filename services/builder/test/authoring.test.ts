import { it, expect, vi } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { type WorldDoc, type ChildDoc, type PatchWorldJob } from '@just-imagine/protocol';
import { reviseCreation, reconcileArt } from '../src/revisions';
import { toGenerated } from '../src/prompts/v1';
import { validateScene } from '@just-imagine/scene-schema';
import { requireMotionArtwork, MotionArtworkError } from '../src/motion';

const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
const world = {
  doc,
  title: doc.title,
  concepts: doc.learning.concepts,
  styleVersion: 'v1',
  creation: {
    originalWish: 'A garden where clouds tell stories',
    changes: ['Let the dragon listen'],
    mode: 'freeplay',
  },
} as WorldDoc;
const child = { ageBand: '8-10', language: 'bn' } as ChildDoc;
it('does not publish a finished motion world while its requested actor lacks animation', () => {
  const scene = structuredClone(doc),
    hero = scene.entities.find((e) => e.id === scene.learning.heroEntityId)!;
  hero.locomotion = { kind: 'run', stride: 1, facing: 'right' };
  expect(() => requireMotionArtwork(scene)).toThrow(MotionArtworkError);
  hero.asset = {
    status: 'ready',
    url: '/approved',
    width: 768,
    height: 768,
    animation: { columns: 3, rows: 3, frames: 9 },
  };
  expect(() => requireMotionArtwork(scene)).not.toThrow();
  delete hero.locomotion;
  delete hero.asset;
  expect(() => requireMotionArtwork(scene)).not.toThrow();
});
const job = {
  kind: 'patch',
  jobId: 'j_edit',
  worldId: doc.worldId,
  uid: 'u_one',
  childId: 'c_one',
  sessionId: 's_one',
  plan: 'family',
  instruction: 'Add a cloud who follows my tap. No scores or sliders.',
  promptVersion: 'v1',
} as PatchWorldJob;

it('regenerates changed locomotion while retaining an unchanged articulated atlas', () => {
  const before = structuredClone(doc),
    hero = before.entities.find((e) => e.id === before.learning.heroEntityId)!;
  hero.asset = {
    url: 'https://owned.test/run',
    width: 768,
    height: 512,
    status: 'ready',
    animation: { columns: 3, rows: 2, frames: 6 },
  };
  hero.locomotion = { kind: 'run', stride: 1, facing: 'right' };
  const same = reconcileArt(before, before);
  expect(same.entities.find((e) => e.id === hero.id)?.asset).toEqual(hero.asset);
  const faster = structuredClone(before);
  faster.entities.find((e) => e.id === hero.id)!.locomotion!.stride = 1.5;
  expect(reconcileArt(before, faster).entities.find((e) => e.id === hero.id)?.asset).toEqual(
    hero.asset,
  );
  const changed = structuredClone(before);
  changed.entities.find((e) => e.id === hero.id)!.locomotion!.kind = 'swim';
  expect(
    reconcileArt(before, changed).entities.find((e) => e.id === hero.id)?.asset,
  ).toBeUndefined();
});

it('recomposes a new actor and action from the child request without forcing scores or controls', async () => {
  const changed = structuredClone(doc);
  changed.learning.mode = 'incidental';
  changed.rules = [];
  changed.entities.push({
    ...structuredClone(doc.entities.find((e) => e.id === doc.learning.heroEntityId)!),
    id: 'story_cloud',
    name: 'Story cloud',
    tags: ['story_cloud'],
    transform: { x: 10, y: 3, rotation: 0 },
    character: {
      name: 'Cloud',
      personality: 'A quiet storyteller',
      greeting: 'What shape shall I be?',
      topic: 'Inventing cloud stories',
    },
  });
  const source =
    "game.on('tap', e => { if(e.target && e.target.id === 'story_cloud') game.move('story_cloud', {x:5,y:3}); });";
  const generateScene = vi.fn(async (_prompt: string) => toGenerated(changed));
  const generateScript = vi.fn(async (_prompt: string) => ({ kind: 'game', source }));
  const reviewScene = vi.fn(async () => null);
  const result = await reviseCreation(world, job, child, {
    generateScene,
    generateScript,
    reviewScene,
  });
  expect(reviewScene).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ kind: 'build' }),
    world.doc,
  );
  expect(validateScene(result.doc).ok).toBe(true);
  expect(result.doc.entities.some((e) => e.id === 'story_cloud' && e.character)).toBe(true);
  expect(result.doc.game?.script.source).toBe(source);
  expect(result.creation.originalWish).toBe(world.creation?.originalWish);
  expect(result.creation.changes).toEqual(['Let the dragon listen', job.instruction]);
  expect(generateScript.mock.calls[0]![0]).toContain('Bangla');
  expect(generateScript.mock.calls[0]![0]).toContain('No scores or sliders');
  expect(generateScene.mock.calls[0]![0]).toContain(world.creation!.originalWish);
  expect(generateScene.mock.calls[0]![0]).not.toContain('Six validated examples');
  expect(result.doc.variables).toBeUndefined();
});

it('invalidates only appearance changes, including stale collider refs, while preserving owned art', () => {
  const before = structuredClone(doc);
  before.theme.backdrop = {
    status: 'ready',
    url: 'https://owned.test/bg',
    width: 1920,
    height: 1080,
  };
  for (const e of before.entities)
    e.asset = {
      status: 'ready',
      url: `https://owned.test/${e.id}`,
      width: 1024,
      height: 1024,
      colliderUrl: `https://owned.test/${e.id}.json`,
    };
  const after = structuredClone(before);
  const hero = after.entities.find((e) => e.id === after.learning.heroEntityId)!;
  hero.description = 'A blue dragon with a woven scarf';
  hero.asset!.url = 'https://unapproved.test/new-image';
  const result = reconcileArt(before, after);
  expect(result.entities.find((e) => e.id === hero.id)?.asset).toBeUndefined();
  expect(result.entities[0]!.asset).toEqual(before.entities[0]!.asset);
  expect(result.theme.backdrop).toEqual(before.theme.backdrop);
  expect(before.entities.find((e) => e.id === hero.id)?.asset?.colliderUrl).toBeDefined();
});

it('stores actual child wishes and edit exclusions instead of only the companion summary', async () => {
  const { initialCreation } = await import('../src/revisions');
  const request = 'A fox who runs to my tap. No obstacles, score, quiz or ending.';
  expect(
    initialCreation({ description: 'A running fox', childRequest: request } as never).originalWish,
  ).toBe(request);
  const raw = 'Make the cloud blue, keeping its name and current actions.';
  const generateScene = vi.fn(async (_prompt: string) => toGenerated(doc));
  const changed = await reviseCreation(world, { ...job, childRequest: raw }, child, {
    generateScene,
    generateScript: async () => ({
      kind: 'game',
      source: "game.on('tap',e=>{if(e.target)game.sound('pop');});",
    }),
  });
  expect(changed.creation.changes.at(-1)).toBe(raw);
  expect(generateScene.mock.calls[0]![0]).toContain(raw);
});

it('retries old moving actors whose ready bitmap has no articulated frames', () => {
  const before = structuredClone(doc),
    hero = before.entities.find((e) => e.id === before.learning.heroEntityId)!;
  hero.locomotion = { kind: 'run', stride: 1, facing: 'right' };
  hero.asset = { status: 'ready', url: 'https://owned.test/old-static', width: 1024, height: 1024 };
  expect(
    reconcileArt(before, before).entities.find((e) => e.id === hero.id)?.asset,
  ).toBeUndefined();
});
