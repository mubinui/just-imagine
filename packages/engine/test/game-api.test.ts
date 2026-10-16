import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation, SCRIPT_SPAWN_BUDGET, type EngineEvent } from '../src/index.js';

const moon = () => structuredClone(FIXTURE_WORLDS.moonBounce);
const pose = (s: Awaited<ReturnType<typeof createSimulation>>, id: string) =>
  s.frame().entities.find((p) => p.id === id)!;

describe('contact events', () => {
  it('emits one contact event per contact episode with both ids and an impulse', async () => {
    const s = await createSimulation(moon());
    const contacts: EngineEvent[] = [];
    s.subscribe((e) => {
      if (e.type === 'contact') contacts.push(e);
    });
    const landings = () =>
      contacts.filter((e) => [e.a, e.b].sort().join(':') === 'bolt_toy:ground');
    s.setGravity({ x: 0, y: 9.81 });
    s.step(600);
    const settled = landings().length;
    expect(settled).toBeGreaterThanOrEqual(1);
    expect(landings()[0]!.impulse).toBeGreaterThan(0);
    // Resting contact is one long episode: no repeats.
    s.step(300);
    expect(landings()).toHaveLength(settled);
    // Leave the ground and land again: a new episode.
    s.impulse('bolt_toy', { x: 0, y: -8 });
    s.step(240);
    expect(landings().length).toBeGreaterThan(settled);
    s.dispose();
  });
});

describe('impulse', () => {
  it('adds to velocity without overwriting it, emitting an input or cancelling a drag', async () => {
    const s = await createSimulation(moon());
    const events: EngineEvent[] = [];
    s.subscribe((e) => events.push(e));
    s.setGravity({ x: 0, y: 0 });
    s.impulse('ball', { x: 3, y: -4 });
    s.step(1);
    s.impulse('ball', { x: 1, y: 0 });
    s.step(1);
    const ball = pose(s, 'ball');
    expect(ball.vx).toBeCloseTo(4, 1);
    expect(ball.vy).toBeCloseTo(-4, 1);
    expect(events.filter((e) => e.type === 'flick' || e.type === 'impulse')).toEqual([]);
    expect(s.snapshot().inputs.filter((e) => e.type === 'flick')).toEqual([]);
    s.dispose();
  });

  it('keeps a held drag alive', async () => {
    const s = await createSimulation(moon());
    s.setGravity({ x: 0, y: 0 });
    s.drag('ball', { x: 5, y: 2 });
    s.impulse('ball', { x: 3, y: 0 });
    s.step(120);
    expect(Math.abs(pose(s, 'ball').x - 5)).toBeLessThan(0.6);
    s.dispose();
  });

  it('targets every entity carrying a tag and caps the speed at 20 m/s', async () => {
    const s = await createSimulation(moon());
    s.setGravity({ x: 0, y: 0 });
    s.impulse('bolt', { x: 100, y: 0 });
    s.step(1);
    const bolt = pose(s, 'bolt_toy');
    expect(Math.hypot(bolt.vx, bolt.vy)).toBeLessThanOrEqual(20.01);
    expect(bolt.vx).toBeGreaterThan(15);
    expect(pose(s, 'ball').vx).toBeCloseTo(0, 3);
    s.dispose();
  });
});

describe('gravity and wind', () => {
  it('sets gravity that survives document updates', async () => {
    const doc = moon();
    const s = await createSimulation(doc);
    s.setGravity({ x: 0, y: 0 });
    expect(s.frame().gravity).toEqual({ x: 0, y: 0 });
    doc.title = 'Renamed';
    doc.environment.wind = { x: 0.5, y: 0 };
    s.update(doc);
    expect(s.frame().gravity).toEqual({ x: 0, y: 0 });
    const y = pose(s, 'ball').y;
    s.step(60);
    expect(pose(s, 'ball').y).toBeCloseTo(y, 3);
    s.dispose();
  });

  it('composes with dials (latest wins) and spells (applied on top)', async () => {
    const s = await createSimulation(moon());
    s.setGravity({ x: 0, y: 5 });
    s.setDial('gravity', 'earth');
    expect(s.frame().gravity.y).toBeCloseTo(9.81);
    s.setGravity({ x: 0, y: 5 });
    s.castSpell('reverseGravity');
    expect(s.frame().gravity.y).toBe(-5);
    s.setGravity({ x: 0, y: 2 });
    expect(s.frame().gravity.y).toBe(-2);
    s.castSpell('restore');
    expect(s.frame().gravity.y).toBe(2);
    s.dispose();
  });

  it('sets wind that pushes bodies and survives document updates', async () => {
    const doc = moon();
    const s = await createSimulation(doc);
    s.setGravity({ x: 0, y: 0 });
    s.setWind({ x: 3, y: 0 });
    doc.environment.gravity = { x: 0, y: 2 };
    s.update(doc);
    s.step(60);
    expect(pose(s, 'ball').vx).toBeGreaterThan(1);
    s.reset();
    expect(s.frame().gravity).toEqual({ x: 0, y: 2 });
    s.dispose();
  });
});

describe('setMaterial', () => {
  it('changes a material from the document table and ignores unknown names', async () => {
    const bounceHeight = async (material?: string) => {
      const s = await createSimulation(moon());
      s.setGravity({ x: 0, y: 9.81 });
      if (material) expect(s.setMaterial('ball', material)).toBe(true);
      let landed = false,
        top = 9;
      for (let i = 0; i < 300; i++) {
        s.step(1);
        const b = pose(s, 'ball');
        if (b.vy < 0) landed = true;
        if (landed) top = Math.min(top, b.y);
      }
      s.dispose();
      return top;
    };
    const rubber = await bounceHeight();
    const metal = await bounceHeight('metal');
    expect(metal).toBeGreaterThan(rubber + 0.5);
    const s = await createSimulation(moon());
    expect(s.setMaterial('ball', 'adamantium')).toBe(false);
    expect(s.setMaterial('nobody', 'metal')).toBe(false);
    s.dispose();
  });
});

describe('spawn and remove', () => {
  it('spawns a dynamic clone of a template with merged tags at a position', async () => {
    const s = await createSimulation(moon());
    const id = s.spawn('ball', { x: 12, y: 3 }, ['extra']);
    expect(id).toEqual(expect.any(String));
    const p = pose(s, id!);
    expect(p).toMatchObject({ templateId: 'ball', tags: ['ball', 'hero', 'extra'] });
    expect(p.x).toBeCloseTo(12, 3);
    expect(p.y).toBeCloseTo(3, 3);
    s.dispose();
  });

  it('honours a requested id and material, rejecting clashes and unknown templates', async () => {
    const s = await createSimulation(moon());
    expect(s.spawn('ball', { x: 12, y: 3 }, [], { id: 's1_fly', material: 'metal' })).toBe(
      's1_fly',
    );
    expect(s.spawn('ball', { x: 12, y: 3 }, [], { id: 's1_fly' })).toBeNull();
    expect(s.spawn('ball', { x: 12, y: 3 }, [], { id: 'ground' })).toBeNull();
    expect(s.spawn('lib/meadow/acorn', { x: 1, y: 1 }, [])).toBeNull();
    expect(s.spawn('nothing', { x: 1, y: 1 }, [])).toBeNull();
    s.dispose();
  });

  it('allows script spawns past the document cap up to the script budget, then returns null', async () => {
    const s = await createSimulation(moon());
    const ids: (string | null)[] = [];
    for (let i = 0; i < SCRIPT_SPAWN_BUDGET; i++)
      ids.push(s.spawn('bolt_toy', { x: 1 + (i % 14), y: 1 + Math.floor(i / 14) * 0.5 }, []));
    expect(ids.every((id) => typeof id === 'string')).toBe(true);
    expect(s.spawn('bolt_toy', { x: 8, y: 1 }, [])).toBeNull();
    expect(s.frame().entities).toHaveLength(3 + SCRIPT_SPAWN_BUDGET);
    s.remove(ids[0]!);
    expect(s.spawn('bolt_toy', { x: 8, y: 1 }, [])).toEqual(expect.any(String));
    s.dispose();
  });

  it('keeps spawned bodies across document updates and removes by id or tag', async () => {
    const doc = moon();
    const s = await createSimulation(doc);
    const a = s.spawn('ball', { x: 12, y: 3 }, ['fly'])!;
    s.spawn('ball', { x: 13, y: 3 }, ['fly']);
    doc.title = 'Renamed';
    s.update(doc);
    expect(s.frame().entities.filter((p) => p.tags?.includes('fly'))).toHaveLength(2);
    expect(s.remove(a)).toBe(1);
    expect(s.remove('fly')).toBe(1);
    expect(s.remove('bolt')).toBe(1);
    s.update(doc);
    expect(s.frame().entities.map((p) => p.id)).toEqual(['ground', 'ball']);
    s.dispose();
  });
});

describe('poses and taps', () => {
  it('carries tags on every pose', async () => {
    const s = await createSimulation(moon());
    expect(s.frame().entities.map((p) => [p.id, p.tags])).toEqual([
      ['ground', ['ground']],
      ['ball', ['ball', 'hero']],
      ['bolt_toy', ['bolt']],
    ]);
    s.dispose();
  });

  it('reports world coordinates on tap events, with or without a target', async () => {
    const s = await createSimulation(moon());
    const taps: EngineEvent[] = [];
    s.subscribe((e) => {
      if (e.type === 'tap') taps.push(e);
    });
    s.tap('ball', { x: 5, y: 2 });
    s.tap('', { x: 14, y: 6 });
    expect(taps.map(({ target, value }) => ({ target, value }))).toEqual([
      { target: 'ball', value: { x: 5, y: 2 } },
      { target: undefined, value: { x: 14, y: 6 } },
    ]);
    s.dispose();
  });

  it('emits a celebrate event for a style', async () => {
    const s = await createSimulation(moon());
    const events: EngineEvent[] = [];
    s.subscribe((e) => events.push(e));
    s.celebrate('confetti');
    expect(events).toEqual([{ type: 'celebrate', value: 'confetti', time: 0 }]);
    s.dispose();
  });
});

it('moves scripted fixed actors within the stage and restores their original position on reset', async () => {
  const doc = moon();
  const actor = doc.entities.find((e) => e.id === 'bolt_toy')!;
  actor.body.isStatic = true;
  const s = await createSimulation(doc);
  try {
    s.move('bolt_toy', { x: 9, y: 3 });
    expect(pose(s, 'bolt_toy').x).toBeCloseTo(9);
    expect(pose(s, 'bolt_toy').y).toBeCloseTo(3);
    s.move('bolt_toy', { x: Infinity, y: 3 });
    expect(pose(s, 'bolt_toy').x).toBeCloseTo(9);
    s.move('bolt_toy', { x: 100, y: -100 });
    expect(pose(s, 'bolt_toy').x).toBeCloseTo(16 - actor.body.size.width / 2, 5);
    expect(pose(s, 'bolt_toy').y).toBeCloseTo(actor.body.size.height / 2, 5);
    s.reset();
    expect(pose(s, 'bolt_toy').x).toBeCloseTo(actor.transform.x);
  } finally {
    s.dispose();
  }
});
