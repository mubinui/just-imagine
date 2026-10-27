import { describe, expect, it } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { WorldDoc } from '@just-imagine/protocol';
import type { SceneDoc } from '@just-imagine/scene-schema';
import {
  applyArt,
  applyStandIns,
  editRequestsFor,
  paintFriends,
  requestsFor,
  startArt,
  type ArtAsset,
  type ArtOutcome,
  type ArtRequest,
} from '../src/art-phase';
import { dropMissingMotion } from '../src/motion';
import { companionHeroEntity } from '../src/hero';
import { FRIEND_STANDINS } from '../src/standins';

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

describe('retry and stand-ins', () => {
  const heroReq = (id: string): ArtRequest => ({ ...request(id), hero: true });
  const failing = (fails: number) => {
    const calls: string[] = [];
    let left = fails;
    return {
      calls,
      generate: async (r: ArtRequest) => {
        calls.push(r.id);
        if (left-- > 0) throw new Error('no art');
        return art(r.id);
      },
    };
  };
  const options = { deadline: 100, concurrency: 1 };

  it('uses the second result when a hero fails once', async () => {
    const f = failing(1);
    const run = startArt([heroReq('car')], f.generate, { ...options, now: () => 0 });
    await run.done;
    expect(f.calls).toEqual(['car', 'car']);
    expect(run.outcomes.get('car')).toEqual({ status: 'ready', asset: art('car') });
  });

  it('tries a hero exactly twice', async () => {
    const f = failing(5);
    const run = startArt([heroReq('car')], f.generate, { ...options, now: () => 0 });
    await run.done;
    expect(f.calls).toHaveLength(2);
    expect(run.outcomes.get('car')).toEqual({ status: 'failed' });
  });

  it('starts no retry after the deadline or with the kill switch on', async () => {
    let t = 0;
    const late = { calls: 0 };
    const run = startArt(
      [heroReq('car')],
      async () => {
        late.calls++;
        t = 200;
        throw new Error('slow');
      },
      { ...options, now: () => t },
    );
    await run.done;
    expect(late.calls).toBe(1);
    let stopped = false;
    const f = failing(5);
    const run2 = startArt(
      [heroReq('car')],
      async (r) => {
        stopped = true;
        return f.generate(r);
      },
      { ...options, now: () => 0, stop: async () => stopped },
    );
    await run2.done;
    expect(f.calls).toHaveLength(1);
  });

  it('never retries backdrop, mid layer or props', async () => {
    const f = failing(10);
    const reqs: ArtRequest[] = [
      { ...heroReq('backdrop'), kind: 'backdrop' },
      { ...heroReq('midLayer'), kind: 'overlay' },
      request('prop'),
    ];
    const run = startArt(reqs, f.generate, { ...options, now: () => 0 });
    await run.done;
    expect(f.calls).toEqual(['backdrop', 'midLayer', 'prop']);
  });

  it('paints a stand-in over a failed hero, character and friend, but not a prop or the backdrop', () => {
    const world = fixtureWorld();
    const doc = world.doc;
    const [hero, other, third] = doc.entities.filter((e) => e.kind === 'sprite');
    doc.learning.heroEntityId = hero!.id;
    hero!.name = 'Red Car';
    hero!.description = 'a red car';
    hero!.locomotion = { kind: 'run', stride: 1, facing: 'right' };
    other!.character = { name: 'Zed', personality: 'shy' } as never;
    other!.tags = ['friend', 'bhombol'];
    third!.character = undefined;
    third!.tags = [];
    third!.name = 'Rock';
    const outcomes = new Map<string, ArtOutcome>(
      [hero!.id, other!.id, third!.id, 'backdrop'].map((id) => [id, { status: 'failed' }]),
    );
    const painted = applyArt(world, outcomes);
    const count = applyStandIns(painted, outcomes);
    const byId = (id: string) => painted.doc.entities.find((e) => e.id === id)!;
    expect(count).toBe(2);
    expect(byId(hero!.id).asset).toMatchObject({ status: 'ready', url: '/standins/car.webp' });
    expect(byId(other!.id).asset?.url).toBe('/standins/friend-bhombol.webp');
    expect(painted.assets[hero!.id]).toEqual({ status: 'ready', url: '/standins/car.webp' });
    expect(painted.assets[third!.id]).toEqual({ status: 'failed' });
    expect(painted.assets['backdrop']).toEqual({ status: 'failed' });
    // A stand-in has no animation, so the hero's locomotion is dropped and it stays ready.
    expect(dropMissingMotion(painted.doc)).toContain(hero!.id);
    expect(byId(hero!.id).locomotion).toBeUndefined();
    expect(byId(hero!.id).asset?.status).toBe('ready');
  });

  it('uses the crate for an unmatched hero', () => {
    const world = fixtureWorld();
    const hero = world.doc.entities.find((e) => e.kind === 'sprite')!;
    world.doc.learning.heroEntityId = hero.id;
    hero.name = 'Zorp';
    hero.tags = [];
    hero.description = 'a wobbly thing';
    const outcomes = new Map<string, ArtOutcome>([[hero.id, { status: 'failed' }]]);
    const painted = applyArt(world, outcomes);
    applyStandIns(painted, outcomes);
    expect(painted.doc.entities.find((e) => e.id === hero.id)!.asset?.url).toBe(
      '/standins/crate.webp',
    );
  });
});

describe('the friend art', () => {
  /** The friend the hero insert makes (no friend tag) and the friend beside the hero. */
  function withFriends(): WorldDoc {
    const world = fixtureWorld();
    const asHero = companionHeroEntity('mishti', 'wood');
    const beside = { ...companionHeroEntity('bhombol', 'wood'), id: 'bhombol_2' };
    beside.tags = ['friend', 'bhombol'];
    beside.locomotion = { kind: 'run', stride: 1, facing: 'right' };
    world.doc.entities.push(asHero, beside);
    world.doc.learning.heroEntityId = 'mishti';
    return world;
  }
  const frame = (id: keyof typeof FRIEND_STANDINS) => ({
    status: 'ready',
    url: FRIEND_STANDINS[id].url,
    width: FRIEND_STANDINS[id].width,
    height: FRIEND_STANDINS[id].height,
  });
  const byId = (world: WorldDoc, id: string) => world.doc.entities.find((e) => e.id === id)!;

  it('asks for no picture of the friend, even when the friend is the hero', () => {
    const ids = requestsFor(withFriends().doc, 'free').map((r) => r.id);
    expect(ids).toContain('dragon');
    expect(ids).not.toContain('mishti');
    expect(ids).not.toContain('bhombol_2');
  });

  it('paints each friend its own frame and keeps one already painted', () => {
    const world = withFriends();
    expect(paintFriends(world)).toBe(2);
    expect(byId(world, 'mishti').asset).toEqual(frame('mishti'));
    expect(byId(world, 'bhombol_2').asset).toEqual(frame('bhombol'));
    expect(world.assets['mishti']).toEqual({ status: 'ready', url: FRIEND_STANDINS.mishti.url });
    expect(world.assets['bhombol_2']).toEqual({
      status: 'ready',
      url: FRIEND_STANDINS.bhombol.url,
    });
    // A still frame cannot run.
    expect(byId(world, 'bhombol_2').locomotion).toBeUndefined();
    expect(byId(world, 'dragon').asset).toBeUndefined();
    const kept = byId(world, 'mishti').asset;
    paintFriends(world);
    expect(byId(world, 'mishti').asset).toBe(kept);
  });

  it('never lets the image cap drop the friend', () => {
    const world = withFriends();
    for (let i = 0; i < 40; i++)
      world.doc.entities.push({
        ...structuredClone(byId(world, 'pebble')),
        id: `pal_${i}`,
        character: { name: `Pal ${i}`, personality: 'kind' } as never,
      });
    const ids = requestsFor(world.doc, 'free').map((r) => r.id);
    expect(ids.length).toBeLessThan(world.doc.entities.length);
    expect(ids.filter((id) => id === 'mishti' || id === 'bhombol_2')).toEqual([]);
    paintFriends(world);
    expect(byId(world, 'mishti').asset).toEqual(frame('mishti'));
    expect(byId(world, 'bhombol_2').asset).toEqual(frame('bhombol'));
  });

  it('asks for no picture of the friend in an edit, even a changed one', () => {
    const before = withFriends();
    paintFriends(before);
    const after = structuredClone(before.doc);
    byId({ ...before, doc: after }, 'bhombol_2').description = 'a puppy in a red hat';
    const ids = editRequestsFor(after, before.doc, 'free').map((r) => r.id);
    expect(ids).not.toContain('mishti');
    expect(ids).not.toContain('bhombol_2');
  });
});
