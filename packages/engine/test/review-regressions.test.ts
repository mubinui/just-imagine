import { it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation } from '../src/index';
import type { SceneDoc } from '@just-imagine/scene-schema';
function scene(): SceneDoc {
  const d = structuredClone(FIXTURE_WORLDS.moonBounce);
  const e = structuredClone(d.entities.find((e) => e.id === d.learning.heroEntityId)!);
  e.id = 'ball';
  e.tags = ['ball'];
  e.body = { shape: 'box', material: 'solid', isStatic: false, size: { width: 1, height: 1 } };
  e.behaviors = [];
  e.transform = { x: 8, y: 3, rotation: 0 };
  d.materials = {
    solid: {
      density: 2,
      friction: 0.8,
      restitution: 0,
      softness: 0,
      buoyant: false,
      breakable: false,
      pretend: false,
    },
  };
  const floor = structuredClone(e);
  floor.id = 'floor';
  floor.tags = ['floor'];
  floor.body.isStatic = true;
  floor.body.size = { width: 16, height: 0.5 };
  floor.transform.y = 8;
  d.entities = [e, floor];
  d.learning.heroEntityId = 'ball';
  d.learning.dials = ['gravity', 'heroMaterial'];
  d.environment = {
    ...d.environment,
    gravity: { x: 0, y: 9.81 },
    wind: { x: 0, y: 0 },
    medium: 'air',
  };
  d.joints = [];
  d.rules = [];
  d.visuals = [];
  d.variables = {};
  d.challenges = [];
  return d;
}
it('does not resurrect rule removals on asset updates and reconciles variables', async () => {
  const d = scene();
  d.rules = [
    {
      id: 'remove',
      once: true,
      when: { event: 'tap', target: 'ball' },
      then: [{ action: 'remove', target: 'ball' }],
    },
  ];
  const s = await createSimulation(d);
  s.tap('ball');
  d.title = 'Asset update';
  s.update(d);
  expect(s.snapshot().entities.map((e) => e.id)).not.toContain('ball');
  d.variables = {
    g: {
      label: 'Gravity',
      min: 0,
      max: 20,
      step: 1,
      value: 3,
      unit: '',
      binds: { kind: 'gravity' },
    },
  };
  s.update(d);
  expect(s.snapshot().variables).toEqual({ g: 3 });
  d.variables = {};
  s.update(d);
  expect(s.snapshot().variables).toEqual({});
  s.dispose();
});
it('joint edits and attached-body rebuilds preserve clock and constrain the bob', async () => {
  const d = scene();
  d.entities[0]!.transform.rotation = Math.PI / 2;
  d.entities[1]!.transform = { x: 8, y: 2, rotation: Math.PI / 3 };
  d.entities[1]!.body.size = { width: 0.2, height: 0.2 };
  d.joints = [{ type: 'pin', a: 'ball', b: 'floor', anchor: { x: 8, y: 2 } }];
  const s = await createSimulation(d);
  s.step(10);
  expect(s.frame().entities.find((e) => e.id === 'ball')!.x).toBeCloseTo(8, 2);
  expect(s.frame().entities.find((e) => e.id === 'ball')!.y).toBeCloseTo(3, 2);
  const t = s.snapshot().time;
  d.entities[0]!.body.size.width = 0.8;
  s.update(d);
  expect(s.snapshot().time).toBe(t);
  s.flick('ball', { x: 5, y: 0 });
  s.step(120);
  expect(
    Math.hypot(
      s.snapshot().entities.find((e) => e.id === 'ball')!.x - 8,
      s.snapshot().entities.find((e) => e.id === 'ball')!.y - 2,
    ),
  ).toBeCloseTo(1, 1);
  d.joints = [];
  s.update(d);
  expect(s.snapshot().time).toBeGreaterThan(t);
  s.dispose();
});
it('uses effective density in water and floats dense bodies with restore', async () => {
  const d = scene();
  d.entities = d.entities.slice(0, 1);
  d.environment.medium = 'water';
  d.variables = {
    rho: {
      label: 'Density',
      min: 0.2,
      max: 8,
      step: 0.1,
      value: 0.5,
      unit: '',
      binds: { kind: 'material', entity: 'ball', prop: 'density' },
    },
  };
  const light = await createSimulation(d),
    heavy = await createSimulation(d);
  heavy.setVariable('rho', 5);
  light.step(20);
  heavy.step(20);
  expect(light.snapshot().entities[0]!.vy).toBeLessThan(0);
  expect(heavy.snapshot().entities[0]!.vy).toBeGreaterThan(0);
  heavy.castSpell('floatAll');
  heavy.step(60);
  expect(heavy.snapshot().entities[0]!.vy).toBeLessThan(0);
  heavy.castSpell('restore');
  heavy.step(30);
  expect(heavy.snapshot().entities[0]!.vy).toBeGreaterThan(0);
  light.dispose();
  heavy.dispose();
});
it('maintains a stationary drag hold and releases cancellation without launch', async () => {
  const s = await createSimulation(scene());
  s.drag('ball', { x: 8, y: 3 });
  s.step(120);
  expect(s.snapshot().entities.find((e) => e.id === 'ball')!.y).toBeCloseTo(3, 1);
  s.cancelDrag('ball');
  s.step(30);
  expect(s.snapshot().entities.find((e) => e.id === 'ball')!.y).toBeGreaterThan(3.5);
  s.dispose();
});
it('accumulates settled landing trials and retains them after removal', async () => {
  const d = scene();
  d.visuals = [
    {
      type: 'histogram',
      id: 'landings',
      title: 'Landings',
      bins: 4,
      source: { tag: 'ball', prop: 'x' },
    },
  ];
  d.challenges = [
    {
      id: 'trial',
      goal: 'Land',
      hint: 'Drop',
      concept: 'gravity',
      check: { event: 'histogramFilled', id: 'landings', count: 1 },
      reward: [{ action: 'say', text: 'landed' }],
    },
  ];
  d.rules = [
    {
      id: 'remove',
      once: true,
      when: { event: 'tap', target: 'ball' },
      then: [{ action: 'remove', target: 'ball' }],
    },
  ];
  const s = await createSimulation(d);
  s.step(10);
  expect(s.snapshot().challenges).toEqual([]);
  s.step(300);
  expect(s.snapshot().histograms.landings?.reduce((a, b) => a + b, 0)).toBe(1);
  expect(s.snapshot().challenges).toEqual(['trial']);
  s.tap('ball');
  s.step(30);
  expect(s.snapshot().histograms.landings?.reduce((a, b) => a + b, 0)).toBe(1);
  s.dispose();
});
it('rotates nine equal-radius soft nodes and toggles lattices with material', async () => {
  const d = scene();
  d.materials.soft = { ...d.materials.solid!, softness: 0.8 };
  d.entities[0]!.body.material = 'soft';
  d.entities[0]!.transform.rotation = Math.PI / 2;
  const s = await createSimulation(d);
  const p = s.snapshot().entities.find((e) => e.id === 'ball')!;
  expect(p.nodes).toHaveLength(9);
  expect(p.nodes![0]!.x).toBeCloseTo(8.5);
  expect(p.nodes![0]!.y).toBeCloseTo(2.5);
  s.setDial('heroMaterial', 'solid');
  expect(s.snapshot().entities.find((e) => e.id === 'ball')!.nodes).toBeUndefined();
  s.setDial('heroMaterial', 'soft');
  expect(s.snapshot().entities.find((e) => e.id === 'ball')!.nodes).toHaveLength(9);
  s.dispose();
});

it('does not change polygon geometry when restoring an unrelated spell', async () => {
  const d = scene();
  d.entities[1]!.body.shape = 'polygon';
  d.entities[1]!.body.vertices = [
    { x: -8, y: 0.25 },
    { x: 8, y: 0.25 },
    { x: 8, y: -3 },
  ];
  const a = await createSimulation(d),
    b = await createSimulation(d);
  a.castSpell('slowTime');
  a.castSpell('restore');
  a.step(180);
  b.step(180);
  expect(a.snapshot().entities).toEqual(b.snapshot().entities);
  a.dispose();
  b.dispose();
});
it('validates optional convex collider assets and preserves poses and attached joints', async () => {
  const d = scene();
  d.entities[0]!.body.shape = 'auto';
  d.joints = [{ type: 'pin', a: 'ball', b: 'floor', anchor: { x: 8, y: 7 } }];
  const s = await createSimulation(d);
  s.step(5);
  const p = s.frame().entities.find((e) => e.id === 'ball')!;
  expect(
    s.setCollider('ball', {
      vertices: [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0, y: 0.5 },
      ],
      parts: [
        [
          { x: -0.5, y: -0.5 },
          { x: 0.5, y: -0.5 },
          { x: 0, y: 0.5 },
        ],
      ],
    }),
  ).toBe(true);
  expect(s.frame().entities.find((e) => e.id === 'ball')!.x).toBe(p.x);
  expect(s.setCollider('ball', { vertices: [], parts: [] })).toBe(false);
  expect(
    s.setCollider('ball', {
      vertices: [
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      parts: [],
    }),
  ).toBe(false);
  s.dispose();
});
it('exposes render frames without history or replay metadata', async () => {
  const s = await createSimulation(scene());
  s.step(300);
  const frame = s.frame();
  expect(frame).not.toHaveProperty('history');
  expect(frame).not.toHaveProperty('inputs');
  expect(s.snapshot().history.length).toBeGreaterThan(0);
  s.dispose();
});

it('bounds all per-entity caches through repeated spawn scale and removal', async () => {
  const d = scene();
  d.rules = [
    {
      id: 'cycle',
      once: false,
      when: { event: 'tap', target: 'floor' },
      then: [
        { action: 'spawn', template: 'ball', at: { x: 8, y: 3 }, count: 1 },
        { action: 'scaleEntity', target: 'ball', factor: 2 },
        { action: 'remove', target: 'ball' },
      ],
    },
  ];
  const s = await createSimulation(d);
  for (let n = 0; n < 150; n++) s.tap('floor');
  const caches = s as unknown as {
    scales: Map<string, number>;
    launches: Map<string, unknown>;
    effectiveMaterials: Map<string, unknown>;
    submerged: Set<string>;
    colliderParts: Map<string, unknown>;
    lattices: Map<string, unknown>;
    holds: Map<string, unknown>;
  };
  for (const cache of [
    caches.scales,
    caches.launches,
    caches.submerged,
    caches.colliderParts,
    caches.lattices,
    caches.holds,
  ])
    expect(cache.size).toBe(0);
  expect(caches.effectiveMaterials.size).toBe(1);
  s.dispose();
});
it('does not recount a settled trial after a collider or scale rebuild', async () => {
  const d = scene();
  d.visuals = [
    {
      type: 'histogram',
      id: 'landings',
      title: 'Landings',
      bins: 4,
      source: { tag: 'ball', prop: 'x' },
    },
  ];
  const s = await createSimulation(d);
  s.step(300);
  s.castSpell('grow', 'ball');
  s.step(300);
  expect(s.snapshot().histograms.landings?.reduce((a, b) => a + b, 0)).toBe(1);
  s.dispose();
});

it('reapplies selected material and scale bindings after body and material document patches', async () => {
  const d = scene();
  d.environment.medium = 'water';
  d.variables = {
    density: {
      label: 'Density',
      min: 0.2,
      max: 8,
      step: 0.1,
      value: 0.5,
      unit: '',
      binds: { kind: 'material', entity: 'ball', prop: 'density' },
    },
    size: {
      label: 'Size',
      min: 0.5,
      max: 2,
      step: 0.1,
      value: 1,
      unit: '',
      binds: { kind: 'scale', entity: 'ball' },
    },
  };
  const s = await createSimulation(d);
  s.setVariable('density', 5);
  s.setVariable('size', 1.5);
  d.entities[0]!.body.size.width = 1.2;
  d.materials.solid!.density = 0.3;
  s.update(d);
  expect(s.frame().variables.density).toBeCloseTo(5);
  expect(s.frame().variables.size).toBe(1.5);
  expect(s.frame().entities.find((e) => e.id === 'ball')!.width).toBeCloseTo(1.8);
  s.step(15);
  expect(s.frame().entities.find((e) => e.id === 'ball')!.vy).toBeGreaterThan(0);
  s.dispose();
});
it('invalidates collider outlines on asset identity changes but retains same-source shapes', async () => {
  const d = scene();
  d.entities[0]!.body.shape = 'auto';
  d.entities[0]!.asset = {
    url: '/a.png',
    colliderUrl: '/a.json',
    width: 10,
    height: 10,
    status: 'ready',
  };
  const s = await createSimulation(d);
  const outline = {
    vertices: [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0, y: 0.5 },
    ],
    parts: [
      [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0, y: 0.5 },
      ],
    ],
  };
  s.setCollider('ball', outline);
  const parts = (s as unknown as { colliderParts: Map<string, unknown> }).colliderParts;
  s.update(d);
  expect(parts.has('ball')).toBe(true);
  const before = s.frame().entities.find((e) => e.id === 'ball');
  d.entities[0]!.asset!.url = '/b.png';
  delete d.entities[0]!.asset!.colliderUrl;
  s.update(d);
  expect(parts.has('ball')).toBe(false);
  expect(s.frame().entities.find((e) => e.id === 'ball')).toEqual(before);
  s.dispose();
});
it('keeps auto-shaped water pass-through when generated colliders arrive', async () => {
  const d = scene();
  const water = structuredClone(d.entities[1]!);
  water.id = 'water';
  water.kind = 'water';
  water.body.shape = 'auto';
  water.body.size = { width: 8, height: 2 };
  water.transform = { x: 8, y: 5, rotation: 0 };
  d.entities.push(water);
  const a = await createSimulation(d),
    b = await createSimulation(d);
  expect(
    a.setCollider('water', {
      vertices: [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 },
      ],
      parts: [
        [
          { x: -0.5, y: -0.5 },
          { x: 0.5, y: -0.5 },
          { x: 0.5, y: 0.5 },
          { x: -0.5, y: 0.5 },
        ],
      ],
    }),
  ).toBe(true);
  a.step(120);
  b.step(120);
  expect(a.frame().entities.find((e) => e.id === 'ball')!.y).toBeCloseTo(
    b.frame().entities.find((e) => e.id === 'ball')!.y,
    3,
  );
  a.dispose();
  b.dispose();
});
