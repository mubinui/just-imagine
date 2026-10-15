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
    scale = { x: 1, set: vi.fn() };
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
    anchor = { set: vi.fn() };
    width = 0;
    height = 0;
  }
  class MeshPlane extends Sprite {}
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
