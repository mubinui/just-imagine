import { describe, expect, it } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { WorldDoc } from '@just-imagine/protocol';
import type { SceneDoc } from '@just-imagine/scene-schema';
import {
  applyArt,
  requestsFor,
  startArt,
  type ArtAsset,
  type ArtOutcome,
  type ArtRequest,
} from '../src/art-phase';
import { dropMissingMotion } from '../src/motion';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const request = (id: string): ArtRequest => ({
  id,
  description: `a ${id}`,
  kind: 'sprite',
  hero: false,
});
const art = (id: string): ArtAsset => ({
  url: `https://art.test/${id}.webp`,
  width: 64,
  height: 64,
});

function fixtureWorld(): WorldDoc {
  const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
  doc.theme.midLayerDescription = 'drifting paper lanterns';
  doc.game = { script: { apiVersion: 1, source: 'game.onStart(() => {});', hash: 'h' } };
  return {
    ownerUid: 'u',
    childId: 'c',
    title: doc.title,
    status: 'building',
    doc,
    schemaVersion: 1,
    promptVersion: 'v1',
    styleVersion: 'v1',
    assets: {},
    concepts: doc.learning.concepts,
    thumbnailUrl: null,
    jobId: 'j',
    createdAt: 1,
    updatedAt: 1,
  } as WorldDoc;
}

describe('startArt', () => {
  it('runs four at a time, reports each outcome, and stops starting new work after the deadline', async () => {
    let t = 0;
    let inFlight = 0;
    let peak = 0;
    const updates: [string, ArtOutcome['status']][] = [];
    const art6 = startArt(
      ['a', 'b', 'c', 'd', 'e', 'f'].map(request),
      async (r) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(10);
        inFlight--;
        // The first four finish together, and the clock has passed the deadline by then.
        t = 200;
        return art(r.id);
      },
      { deadline: 100, now: () => t, onUpdate: (id, o) => updates.push([id, o.status]) },
    );
    await art6.done;
    expect(peak).toBe(4);
    expect([...art6.outcomes].map(([id, o]) => [id, o.status])).toEqual([
      ['a', 'ready'],
      ['b', 'ready'],
      ['c', 'ready'],
      ['d', 'ready'],
      ['e', 'failed'],
      ['f', 'failed'],
    ]);
    expect(art6.outcomes.get('a')).toEqual({ status: 'ready', asset: art('a') });
    expect(updates.filter(([, s]) => s === 'generating').map(([id]) => id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(updates.filter(([, s]) => s !== 'generating')).toHaveLength(6);
  });

  it('marks a request failed when generation throws and keeps going', async () => {
    const run = startArt(
      ['a', 'b'].map(request),
      async (r) => {
        if (r.id === 'a') throw new Error('no sheet');
        return art(r.id);
      },
      { deadline: Number.POSITIVE_INFINITY, concurrency: 1 },
    );
    await run.done;
    expect(run.outcomes.get('a')).toEqual({ status: 'failed' });
    expect(run.outcomes.get('b')?.status).toBe('ready');
  });

  it('starts nothing once the kill switch is on', async () => {
    let calls = 0;
    const run = startArt(
      ['a', 'b'].map(request),
      async (r) => {
        calls++;
        return art(r.id);
      },
      { deadline: Number.POSITIVE_INFINITY, stop: async () => true },
    );
    await run.done;
    expect(calls).toBe(0);
    expect([...run.outcomes.values()].map((o) => o.status)).toEqual(['failed', 'failed']);
  });

  it('resolves at once with no requests', async () => {
    const run = startArt([], async () => art('x'), { deadline: 0 });
    await run.done;
    expect(run.outcomes.size).toBe(0);
  });
});

describe('applyArt', () => {
  it('applies ready outcomes to the backdrop, mid layer and entities and leaves failed ones as failed', () => {
    const world = fixtureWorld();
    const outcomes = new Map<string, ArtOutcome>([
      ['backdrop', { status: 'ready', asset: { ...art('backdrop'), width: 2048, height: 1152 } }],
      ['midLayer', { status: 'ready', asset: art('mid') }],
      [
        'dragon',
        {
          status: 'ready',
          asset: {
            ...art('dragon'),
            colliderUrl: 'https://art.test/dragon.json',
            animation: { columns: 3, rows: 3, frames: 9 },
          },
        },
      ],
      ['cloud1', { status: 'failed' }],
      ['pebble', { status: 'generating' }],
    ]);
    const next = applyArt(world, outcomes);
    expect(next.doc.theme.backdrop).toEqual({
      status: 'ready',
      url: 'https://art.test/backdrop.webp',
      width: 2048,
      height: 1152,
    });
    expect(next.thumbnailUrl).toBe('https://art.test/backdrop.webp');
    expect(next.doc.theme.midLayer).toEqual({
      status: 'ready',
      url: 'https://art.test/mid.webp',
      width: 64,
      height: 64,
    });
    expect(next.doc.entities.find((e) => e.id === 'dragon')!.asset).toEqual({
      status: 'ready',
      url: 'https://art.test/dragon.webp',
      width: 64,
      height: 64,
      colliderUrl: 'https://art.test/dragon.json',
      animation: { columns: 3, rows: 3, frames: 9 },
    });
    expect(next.doc.entities.find((e) => e.id === 'cloud1')!.asset).toBeUndefined();
    expect(next.assets).toEqual({
      backdrop: { status: 'ready', url: 'https://art.test/backdrop.webp' },
      midLayer: { status: 'ready', url: 'https://art.test/mid.webp' },
      dragon: {
        status: 'ready',
        url: 'https://art.test/dragon.webp',
        colliderUrl: 'https://art.test/dragon.json',
      },
      cloud1: { status: 'failed' },
      pebble: { status: 'generating' },
    });
    // The painted backdrop now carries the floor, so the base ground is marked painted.
    expect(next.doc.entities.find((e) => e.id === 'ground')!.tags).toContain('painted_ground');
    // The input world is not changed.
    expect(world.doc.theme.backdrop.status).toBe('placeholder');
    expect(world.assets).toEqual({});
  });
});

describe('requestsFor', () => {
  it('asks for the backdrop, mid layer, then the hero and characters first, capped by the plan', () => {
    const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
    doc.theme.midLayerDescription = 'drifting paper lanterns';
    const dragon = doc.entities.find((e) => e.id === 'dragon')!;
    dragon.locomotion = { kind: 'run', stride: 1, facing: 'right' };
    const requests = requestsFor(doc, 'free');
    expect(requests.map((r) => r.id).slice(0, 3)).toEqual(['backdrop', 'midLayer', 'dragon']);
    expect(requests[2]).toMatchObject({ hero: true, locomotion: dragon.locomotion });
    expect(requests.every((r) => r.id !== 'ground')).toBe(true);
    const many = structuredClone(doc);
    for (let i = 0; i < 40; i++)
      many.entities.push({ ...structuredClone(many.entities[3]!), id: `pebble_${i}` });
    expect(requestsFor(many, 'free').length).toBeLessThan(many.entities.length);
  });
});

describe('dropMissingMotion', () => {
  it('drops locomotion only from moving sprites without animation art', () => {
    const doc: SceneDoc = structuredClone(FIXTURE_WORLDS.jellyDragon);
    const runner = doc.entities.find((e) => e.id === 'dragon')!;
    runner.id = 'runner';
    runner.locomotion = { kind: 'run', stride: 1, facing: 'right' };
    const roller = doc.entities.find((e) => e.id === 'pebble')!;
    roller.id = 'roller';
    roller.locomotion = { kind: 'roll', stride: 1, facing: 'right' };
    roller.asset = { status: 'ready', url: '/roller.webp', width: 64, height: 64 };
    const walker = doc.entities.find((e) => e.id === 'cloud1')!;
    walker.locomotion = { kind: 'walk', stride: 1, facing: 'left' };
    walker.asset = {
      status: 'ready',
      url: '/walker.webp',
      width: 64,
      height: 64,
      animation: { columns: 3, rows: 3, frames: 9 },
    };
    const ids = dropMissingMotion(doc);
    expect(ids).toEqual(['runner']);
    expect(doc.entities.find((e) => e.id === 'runner')!.locomotion).toBeUndefined();
    expect(doc.entities.find((e) => e.id === 'roller')!.locomotion?.kind).toBe('roll');
    expect(doc.entities.find((e) => e.id === 'cloud1')!.locomotion?.kind).toBe('walk');
    expect(dropMissingMotion(doc)).toEqual([]);
  });
});
