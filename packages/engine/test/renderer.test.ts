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
  return {
    Application,
    Container,
    Graphics,
    Sprite,
    Text,
    MeshPlane,
    Texture: {
      from: () => {
        const t = { destroy: vi.fn() };
        state.textures.push(t);
        return t;
      },
    },
  };
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
