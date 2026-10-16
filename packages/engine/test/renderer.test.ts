/* eslint-disable @typescript-eslint/no-explicit-any -- Narrow Pixi test doubles model only engine-used renderer operations. */
import { it, expect, vi, afterEach } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
const state = vi.hoisted(() => ({ apps: [] as any[], fail: false, textures: [] as any[] }));
vi.mock('pixi.js', () => {
  class Container {
    children: any[] = [];
    destroyed = false;
    visible = true;
    alpha = 1;
    rotation = 0;
    tint = 0;
    position = { set: vi.fn() };
    scale = {
      x: 1,
      y: 1,
      set: vi.fn((x: number, y = x) => {
        this.scale.x = x;
        this.scale.y = y;
      }),
    };
    addChild(...children: any[]) {
      for (const c of children) {
        this.removeChild(c);
        this.children.push(c);
      }
      return children[0];
    }
    removeChild(c: any) {
      this.children = this.children.filter((x) => x !== c);
    }
    removeChildren() {
      return this.children.splice(0);
    }
    destroy() {
      this.destroyed = true;
      for (const c of this.removeChildren()) c.destroy();
    }
  }
  class Graphics extends Container {
    roundRect() {
      return this;
    }
    fill() {
      return this;
    }
    circle() {
      return this;
    }
    clear() {
      return this;
    }
    rect() {
      return this;
    }
    moveTo() {
      return this;
    }
    lineTo() {
      return this;
    }
    stroke() {
      return this;
    }
    arc() {
      return this;
    }
  }
  class Text extends Container {
    text: string;
    constructor(o: any) {
      super();
      this.text = o.text;
    }
  }
  class Sprite extends Container {
    constructor(public texture?: unknown) {
      super();
    }
    anchor = { set: vi.fn() };
    width = 0;
    height = 0;
  }
  class MeshPlane extends Container {
    texture: unknown;
    geometry = {
      getAttribute: () => ({ buffer: { data: new Float32Array(18), update: vi.fn() } }),
    };
    constructor(options: { texture: unknown }) {
      super();
      this.texture = options.texture;
    }
  }
  class Application {
    stage = new Container();
    canvas = Object.assign(new EventTarget(), {
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => false,
      releasePointerCapture: vi.fn(),
    });
    renderer = { resize: vi.fn() };
    ticker = { deltaMS: 16.667, add: vi.fn(), remove: vi.fn() };
    destroy = vi.fn(() => this.stage.destroy());
    constructor() {
      state.apps.push(this);
    }
    async init() {
      if (state.fail) throw new Error('GPU failure');
    }
  }
  class Texture {
    width = 768;
    height = 512;
    source: unknown;
    frame: unknown;
    destroy = vi.fn();
    constructor(options: any = {}) {
      this.source = options.source ?? {};
      this.frame = options.frame;
    }
    static from(bitmap?: { width?: number; height?: number }) {
      const t = new Texture();
      t.width = bitmap?.width ?? t.width;
      t.height = bitmap?.height ?? t.height;
      state.textures.push(t);
      return t;
    }
  }
  class Rectangle {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
    ) {}
  }
  return {
    Application,
    Container,
    Graphics,
    Sprite,
    Text,
    MeshPlane,
    Texture,
    Rectangle,
  };
});

it('plays registered frames from actual travel, faces reversal and releases atlas views', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce),
    hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.locomotion = { kind: 'run', stride: 0.3, facing: 'right' };
  hero.body.isStatic = true;
  hero.behaviors = [];
  hero.asset = {
    url: '/run.webp',
    width: 768,
    height: 512,
    status: 'ready',
    animation: { columns: 3, rows: 2, frames: 6 },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  vi.stubGlobal('createImageBitmap', async () => ({ close: vi.fn() }));
  const engine = await mountEngine(setup(), doc),
    app = state.apps[0],
    tick = app.ticker.add.mock.calls[0][0],
    view = app.stage.children[0].children[1].children[doc.entities.indexOf(hero)];
  await vi.waitFor(() => expect(view.children[0].texture?.frame).toBeDefined());
  tick();
  engine.move(hero.id, { x: hero.transform.x + 0.06, y: hero.transform.y });
  tick();
  const running = view.children[0].texture;
  expect(running.frame.x).toBe(256);
  expect(running.frame.width).toBe(256);
  engine.move(hero.id, { x: hero.transform.x, y: hero.transform.y });
  tick();
  expect(view.scale.x).toBeLessThan(0);
  tick();
  expect(view.children[0].texture.frame.x).toBe(0);
  engine.dispose();
  expect(running.destroy).toHaveBeenCalledWith(false);
  expect(state.textures[0].destroy).toHaveBeenCalledWith(true);
});

it('preserves generated pose proportions and pins its ground anchor to the body feet', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce),
    hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.body.size = { width: 2, height: 1.2 };
  hero.body.isStatic = true;
  hero.locomotion = { kind: 'run', stride: 1.2, facing: 'right' };
  hero.asset = {
    url: '/anchored.webp',
    width: 768,
    height: 768,
    status: 'ready',
    animation: {
      columns: 3,
      rows: 3,
      frames: 9,
      anchor: { x: 0.5, y: 0.9375 },
      content: { width: 0.875, height: 0.5 },
    },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  vi.stubGlobal('createImageBitmap', async () => ({ width: 768, height: 768, close: vi.fn() }));
  const engine = await mountEngine(setup(), doc),
    view = state.apps[0].stage.children[0].children[1].children[doc.entities.indexOf(hero)];
  await vi.waitFor(() => expect(view.children[0].texture?.frame).toBeDefined());
  const sprite = view.children[0];
  expect(sprite.width).toBeCloseTo(sprite.height);
  expect(sprite.width).toBeCloseTo(2 / 0.875);
  expect(sprite.anchor.set).toHaveBeenLastCalledWith(0.5, 0.9375);
  expect(sprite.position.set).toHaveBeenLastCalledWith(0, 0.6);
  engine.dispose();
});
import { mountEngine } from '../src/renderer';
afterEach(() => {
  vi.unstubAllGlobals();
  state.fail = false;
  state.apps = [];
  state.textures = [];
});
function setup() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  return { isConnected: true, clientWidth: 960, append: vi.fn() } as unknown as HTMLElement;
}
it('paints all placeholders immediately while backgrounds never resolve and disposes safely', async () => {
  const element = setup();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  doc.theme.backdrop = { ...doc.theme.backdrop, status: 'ready', url: '/slow-bg' };
  for (const e of doc.entities)
    e.asset = { url: '/slow-' + e.id, width: 10, height: 10, status: 'ready' };
  const engine = await mountEngine(element, doc);
  const app = state.apps[0],
    root = app.stage.children[0];
  expect(root.children[1].children).toHaveLength(doc.entities.length);
  const tick = app.ticker.add.mock.calls[0][0];
  const snap = vi.spyOn(engine, 'snapshot');
  tick();
  tick();
  expect(snap).not.toHaveBeenCalled();
  engine.dispose();
  engine.dispose();
  expect(app.destroy).toHaveBeenCalledOnce();
  expect(app.ticker.remove).toHaveBeenCalledOnce();
});
it('destroys partially initialized Pixi applications after init rejects', async () => {
  state.fail = true;
  await expect(mountEngine(setup(), FIXTURE_WORLDS.moonBounce)).rejects.toThrow('GPU failure');
  expect(state.apps[0].destroy).toHaveBeenCalledOnce();
});
it('keeps overlay instances across frames and cancels a pointer without a flick', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  const engine = await mountEngine(setup(), FIXTURE_WORLDS.projectileLab);
  const app = state.apps[0],
    tick = app.ticker.add.mock.calls[0][0];
  tick();
  const overlay = app.stage.children[0].children[2],
    objects = [...overlay.children];
  tick();
  expect(new Set(overlay.children)).toEqual(new Set(objects));
  const ball = engine
    .frame()
    .entities.find((p) => p.id === FIXTURE_WORLDS.projectileLab.learning.heroEntityId)!;
  const dispatch = (type: string, x: number, y: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: 1, clientX: x * 60, clientY: y * 60 });
    app.canvas.dispatchEvent(event);
  };
  dispatch('pointerdown', ball.x, ball.y);
  dispatch('pointermove', ball.x + 0.1, ball.y);
  dispatch('pointercancel', ball.x + 0.1, ball.y);
  expect(engine.snapshot().inputs.filter((e) => e.type === 'flick')).toEqual([]);
  engine.dispose();
});

it('releases owned GPU textures and closes decoded bitmaps on replacement', async () => {
  const { TextureLease } = await import('../src/textures');
  const bitmap = { close: vi.fn() };
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => bitmap),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  const lease = new TextureLease();
  await lease.acquire('/one');
  await lease.acquire('/one');
  expect(state.textures).toHaveLength(1);
  lease.retain(new Set());
  expect(state.textures[0].destroy).toHaveBeenCalledWith(true);
  expect(bitmap.close).toHaveBeenCalledOnce();
  lease.dispose();
  expect(bitmap.close).toHaveBeenCalledOnce();
});
it('closes a late image decode without allocating a texture after disposal', async () => {
  const { TextureLease } = await import('../src/textures');
  let resolve!: (value: { close: ReturnType<typeof vi.fn> }) => void;
  vi.stubGlobal(
    'createImageBitmap',
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  const lease = new TextureLease();
  const loading = lease.acquire('/late');
  const rejection = expect(loading).rejects.toThrow('released');
  await vi.waitFor(() => expect(resolve).toBeDefined());
  lease.dispose();
  const bitmap = { close: vi.fn() };
  resolve(bitmap);
  await rejection;
  expect(bitmap.close).toHaveBeenCalledOnce();
  expect(state.textures).toHaveLength(0);
});

it('retries the same texture URL after a transient failure', async () => {
  const { TextureLease } = await import('../src/textures');
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValue({ ok: true, blob: async () => new Blob() });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('createImageBitmap', async () => ({ close: vi.fn() }));
  const lease = new TextureLease();
  await expect(lease.acquire('/retry')).rejects.toThrow('network');
  await expect(lease.acquire('/retry')).resolves.toBeDefined();
  expect(fetcher).toHaveBeenCalledTimes(2);
  lease.dispose();
});

it('renders spawned template textures, preserves facing and grows the spawned display', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  const hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.asset = { url: '/hero.png', width: 64, height: 64, status: 'ready' };
  hero.behaviors = [{ type: 'face', target: 'pointer' }];
  for (const material of Object.values(doc.materials)) material.softness = 0;
  doc.rules = [
    {
      id: 'spawn',
      once: false,
      when: { event: 'tap', target: hero.id },
      then: [
        { action: 'spawn', template: hero.id, count: 1, at: { x: 8, y: 4 } },
        { action: 'celebrate', style: 'confetti' },
      ],
    },
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  vi.stubGlobal('createImageBitmap', async () => ({ close: vi.fn() }));
  const engine = await mountEngine(setup(), doc);
  const app = state.apps[0],
    tick = app.ticker.add.mock.calls[0][0],
    layer = app.stage.children[0].children[1];
  await vi.waitFor(() =>
    expect(layer.children[doc.entities.indexOf(hero)].children[0].constructor.name).toBe('Sprite'),
  );
  const original = layer.children[doc.entities.indexOf(hero)],
    texture = original.children[0].texture;
  engine.tap(hero.id);
  tick();
  const spawned = engine
    .frame()
    .entities.find((e) => e.templateId === hero.id && e.id !== hero.id)!;
  await vi.waitFor(() => expect(layer.children.at(-1).children[0].texture).toBe(texture));
  const view = layer.children.at(-1);
  engine.castSpell('grow', spawned.id);
  tick();
  expect(Math.abs(view.scale.x)).toBeCloseTo(2);
  expect(view.scale.y).toBeCloseTo(2);
  expect(original.scale.x).toBeLessThan(0);
  const overlay = app.stage.children[0].children[2];
  expect(overlay.children.filter((p: any) => p.visible && p.tint !== 0).length).toBeGreaterThan(0);
  engine.dispose();
});
it('retains displays and fetches/applies unchanged colliders once through progressive updates', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce),
    hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.body.shape = 'auto';
  hero.asset = {
    url: '/hero.png',
    colliderUrl: '/hero.json',
    status: 'ready',
    width: 64,
    height: 64,
  };
  for (const m of Object.values(doc.materials)) m.softness = 0;
  const polygon = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0, y: 0.5 },
  ];
  const fetcher = vi.fn(async (url: string) =>
    url.endsWith('.json')
      ? new Response(JSON.stringify({ vertices: polygon, parts: [polygon] }))
      : { ok: true, blob: async () => new Blob() },
  );
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('createImageBitmap', async () => ({ close: vi.fn() }));
  const engine = await mountEngine(setup(), doc);
  await vi.waitFor(() => expect(state.textures.length).toBeGreaterThan(0));
  const app = state.apps[0],
    layer = app.stage.children[0].children[1],
    views = [...layer.children];
  for (let i = 0; i < 8; i++) {
    doc.title = `patch${i}`;
    engine.update(doc);
  }
  await Promise.resolve();
  expect(layer.children).toEqual(views);
  expect(fetcher.mock.calls.filter(([url]) => url === '/hero.json')).toHaveLength(1);
  engine.dispose();
});

it('keeps a tap impulse alive on pointer release instead of replacing it with a zero-velocity flick', async () => {
  const engine = await mountEngine(setup(), FIXTURE_WORLDS.jellyDragon);
  const app = state.apps[0];
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new Event(type);
    Object.assign(event, { pointerId: 1, clientX: 5 * 60, clientY: 1.8 * 60 });
    app.canvas.dispatchEvent(event);
  }
  expect(engine.snapshot().inputs.filter((event) => event.type === 'tap')).toHaveLength(1);
  expect(engine.snapshot().inputs.filter((event) => event.type === 'flick')).toHaveLength(0);
  expect(engine.frame().entities.find((e) => e.id === 'dragon')!.vy).toBeLessThan(-0.5);
  engine.dispose();
});

it('reports a tap on empty stage with world coordinates and no target', async () => {
  const engine = await mountEngine(setup(), FIXTURE_WORLDS.moonBounce);
  const app = state.apps[0];
  const taps: unknown[] = [];
  engine.subscribe((e) => {
    if (e.type === 'tap') taps.push({ target: e.target, value: e.value });
  });
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new Event(type);
    Object.assign(event, { pointerId: 1, clientX: 14 * 60, clientY: 5 * 60 });
    app.canvas.dispatchEvent(event);
  }
  expect(taps).toEqual([{ target: undefined, value: { x: 14, y: 5 } }]);
  engine.dispose();
});

it('forwards the game APIs to the simulation', async () => {
  const engine = await mountEngine(setup(), FIXTURE_WORLDS.moonBounce);
  const id = engine.spawn('ball', { x: 12, y: 2 }, ['extra']);
  expect(engine.frame().entities.find((p) => p.id === id)?.tags).toContain('extra');
  engine.setGravity({ x: 0, y: 0 });
  expect(engine.frame().gravity).toEqual({ x: 0, y: 0 });
  expect(engine.remove('extra')).toBe(1);
  engine.dispose();
});

it('lets a child select a fixed world character directly on the canvas without an artificial tap rule', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  const actor = doc.entities.find((e) => e.id === 'bolt_toy')!;
  actor.body.isStatic = true;
  actor.character = { name: 'Earth', personality: 'Curious', greeting: 'Hello!', topic: 'Space' };
  const events: any[] = [];
  const engine = await mountEngine(setup(), doc, (e) => events.push(e));
  try {
    const app = state.apps[0];
    const at = engine.frame().entities.find((p) => p.id === actor.id)!;
    for (const type of ['pointerdown', 'pointerup']) {
      const event = new Event(type);
      Object.assign(event, { pointerId: 1, clientX: at.x * 60, clientY: at.y * 60 });
      app.canvas.dispatchEvent(event);
    }
    expect(events.some((e) => e.type === 'tap' && e.target === actor.id)).toBe(true);
    expect(events.some((e) => e.type === 'flick')).toBe(false);
  } finally {
    engine.dispose();
  }
});
