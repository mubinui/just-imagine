import { Application, Container, Graphics, Sprite, Text, MeshPlane } from 'pixi.js';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { readBoundedJson } from './bounded-json';
import { TextureLease } from './textures';
import { recordPointer, pointerVelocity, type PointerSample } from './gesture';
import { createSimulation, type Simulation, type EngineEvent } from './simulation';
export interface Engine extends Simulation {
  readonly canvas: HTMLCanvasElement;
}
export async function mountEngine(
  element: HTMLElement,
  doc: SceneDoc,
  onEvent?: (event: EngineEvent) => void,
): Promise<Engine> {
  const sim = await createSimulation(doc);
  const app = new Application();
  let disposed = false;
  let current = structuredClone(doc);
  let generation = 0;
  const root = new Container();
  const background = new Container(),
    entities = new Container(),
    overlay = new Container();
  root.addChild(background, entities, overlay);
  const meshes = new Map<string, MeshPlane>();
  const textures = new TextureLease();
  const visualGraphics = new Map<number, Graphics>(),
    visualTexts = new Map<number, Text>();
  const graphics = (index: number) => {
    let g = visualGraphics.get(index);
    if (!g) {
      g = new Graphics();
      visualGraphics.set(index, g);
      overlay.addChild(g);
    }
    g.visible = true;
    return g.clear();
  };
  const text = (index: number, value: string, size = 0.22) => {
    let t = visualTexts.get(index);
    if (!t) {
      t = new Text({ text: value, style: { fontSize: size, fill: 0x173b38 } });
      visualTexts.set(index, t);
      overlay.addChild(t);
    }
    t.visible = true;
    if (t.text !== value) t.text = value;
    return t;
  };
  const highlights = new Map<string, number>();
  const particles = Array.from({ length: 32 }, () => {
    const g = new Graphics().circle(0, 0, 0.04).fill(0xf8d979);
    g.visible = false;
    overlay.addChild(g);
    return { g, until: 0 };
  });
  let particleIndex = 0;
  const sprites = new Map<string, Container>();
  try {
    await app.init({
      preference: 'webgpu',
      background: '#eaf4f1',
      antialias: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      autoDensity: true,
    });
  } catch (error) {
    sim.dispose();
    textures.dispose();
    try {
      app.destroy(true, { children: true });
    } catch {
      try {
        app.renderer?.destroy();
      } catch {
        /* initialization may fail before a renderer exists */
      }
    }
    if (!root.destroyed) root.destroy({ children: true });
    throw error;
  }
  if (!element.isConnected) {
    app.destroy(true, { children: true });
    sim.dispose();
    if (!root.destroyed) root.destroy({ children: true });
    throw new Error('Engine mount target disconnected during initialization');
  }
  app.stage.addChild(root);
  element.append(app.canvas);
  app.canvas.style.touchAction = 'none';
  const unsubscribe = onEvent ? sim.subscribe(onEvent) : () => {};
  const resize = () => {
    const width = element.clientWidth || 960;
    const height = (width * 9) / 16;
    app.renderer.resize(width, height);
    root.scale.set(width / 16);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  function drawAssets() {
    const token = ++generation;
    for (const controller of colliderRequests) controller.abort();
    colliderRequests.clear();
    for (const c of entities.removeChildren()) c.destroy({ children: true });
    for (const c of background.removeChildren()) c.destroy({ children: true });
    sprites.clear();
    meshes.clear();
    for (const g of visualGraphics.values()) g.destroy();
    for (const t of visualTexts.values()) t.destroy();
    visualGraphics.clear();
    visualTexts.clear();
    const urls = new Set<string>();
    // Slots and every placeholder are created before starting any network operation.
    const backgrounds = [current.theme.backdrop, current.theme.midLayer].map((asset) => {
      const slot = new Container();
      background.addChild(slot);
      return { asset, slot };
    });
    const pending = current.entities.map((e) => {
      const c = new Container();
      const g = new Graphics()
        .roundRect(
          -e.body.size.width / 2,
          -e.body.size.height / 2,
          e.body.size.width,
          e.body.size.height,
          0.12,
        )
        .fill(e.kind === 'water' ? { color: 0x52b8dc, alpha: 0.45 } : 0xf4ae74);
      c.addChild(g);
      entities.addChild(c);
      sprites.set(e.id, c);
      return { e, c, g };
    });
    for (const { asset, slot } of backgrounds) {
      if (asset?.status !== 'ready') continue;
      urls.add(asset.url);
      void textures
        .acquire(asset.url)
        .then((texture) => {
          if (disposed || token !== generation) return;
          const sprite = new Sprite(texture);
          sprite.width = 16;
          sprite.height = 9;
          slot.addChild(sprite);
        })
        .catch(() => {});
    }
    for (const { e, c, g } of pending) {
      if (e.asset?.status !== 'ready') continue;
      urls.add(e.asset.url);
      void textures
        .acquire(e.asset.url)
        .then((texture) => {
          if (disposed || token !== generation || c.destroyed) return;
          const soft = !!sim.frame().entities.find((p) => p.id === e.id)?.nodes;
          const sprite = soft
            ? new MeshPlane({ texture, verticesX: 3, verticesY: 3 })
            : new Sprite(texture);
          if (sprite instanceof MeshPlane) meshes.set(e.id, sprite);
          else {
            sprite.anchor.set(0.5);
            sprite.width = e.body.size.width;
            sprite.height = e.body.size.height;
          }
          c.removeChild(g);
          g.destroy();
          c.addChild(sprite);
        })
        .catch(() => {});
      if (e.asset.colliderUrl && e.body.shape === 'auto')
        loadCollider(e.id, e.asset.colliderUrl, token);
    }
    textures.retain(urls);
  }
  const colliderRequests = new Set<AbortController>();
  function loadCollider(id: string, url: string, token: number) {
    const controller = new AbortController();
    colliderRequests.add(controller);
    void (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Collider unavailable');
      const value = await readBoundedJson(response, controller);
      if (!disposed && token === generation) sim.setCollider(id, value);
    })()
      .catch(() => {})
      .finally(() => colliderRequests.delete(controller));
  }
  drawAssets();
  let accumulator = 0;
  let previous = sim.frame().entities;
  const ticker = () => {
    if (disposed) return;
    accumulator += Math.min(0.1, app.ticker.deltaMS / 1000);
    while (accumulator >= 1 / 60) {
      previous = sim.frame().entities;
      sim.step();
      accumulator -= 1 / 60;
    }
    const state = sim.frame();
    for (const g of visualGraphics.values()) g.visible = false;
    for (const t of visualTexts.values()) t.visible = false;
    for (const p of particles) {
      p.g.visible = p.until > state.time;
      if (p.g.visible) {
        p.g.y -= 0.003;
        p.g.alpha = Math.min(1, (p.until - state.time) * 2);
      }
    }
    for (const [id, c] of sprites)
      if (!state.entities.some((p) => p.id === id)) {
        c.destroy({ children: true });
        sprites.delete(id);
        meshes.delete(id);
        highlights.delete(id);
      }
    for (const p of state.entities) {
      if (!sprites.has(p.id)) {
        const c = new Container();
        c.addChild(
          new Graphics()
            .roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 0.12)
            .fill(0xf4ae74),
        );
        entities.addChild(c);
        sprites.set(p.id, c);
      }
      const c = sprites.get(p.id);
      if (c) {
        const old = previous.find((e) => e.id === p.id) ?? p,
          alpha = accumulator * 60;
        c.position.set(old.x + (p.x - old.x) * alpha, old.y + (p.y - old.y) * alpha);
        c.rotation = p.rotation;
        c.alpha = (highlights.get(p.id) ?? 0) > state.time ? 0.6 : 1;
        let mesh = meshes.get(p.id);
        if (p.nodes && !mesh) {
          const sprite = c.children.find((child) => child instanceof Sprite) as Sprite | undefined;
          if (sprite) {
            const next = new MeshPlane({ texture: sprite.texture, verticesX: 3, verticesY: 3 });
            c.removeChild(sprite);
            sprite.destroy();
            c.addChild(next);
            meshes.set(p.id, next);
            mesh = next;
          }
        }
        if (!p.nodes && mesh) {
          const sprite = new Sprite(mesh.texture);
          sprite.anchor.set(0.5);
          sprite.width = p.width;
          sprite.height = p.height;
          c.removeChild(mesh);
          mesh.destroy();
          c.addChild(sprite);
          meshes.delete(p.id);
          mesh = undefined;
        }
        if (mesh && p.nodes) {
          c.rotation = 0;
          c.scale.set(1);
          const buffer = mesh.geometry.getAttribute('aPosition').buffer;
          for (let i = 0; i < 9; i++) {
            buffer.data[i * 2] = p.nodes[i]!.x - p.x;
            buffer.data[i * 2 + 1] = p.nodes[i]!.y - p.y;
          }
          buffer.update();
        }
        const original = current.entities.find((e) => e.id === p.id);
        for (const behavior of original?.behaviors ?? []) {
          if (behavior.type === 'glow') c.tint = Number.parseInt(behavior.color.slice(1), 16);
          if (behavior.type === 'face') {
            const hero = state.entities.find((e) => e.id === current.learning.heroEntityId);
            const x = behavior.target === 'hero' ? (hero?.x ?? p.x) : last.x;
            c.scale.x = Math.abs(c.scale.x) * (x < p.x ? -1 : 1);
          }
          if (
            behavior.type === 'emit' &&
            Math.floor(state.time * behavior.rate) !==
              Math.floor((state.time - 1 / 60) * behavior.rate)
          ) {
            const particle = particles[particleIndex++ % particles.length]!;
            particle.until = state.time + 0.6;
            particle.g.position.set(p.x, p.y - 0.3);
            particle.g.visible = true;
          }
        }
        if (original && !mesh)
          c.scale.set(p.width / original.body.size.width, p.height / original.body.size.height);
      }
    }
    for (const [index, v] of (current.visuals ?? []).entries()) {
      if (v.type === 'label') {
        const p = state.entities.find((p) => p.id === v.entity);
        if (p) {
          const t = text(index, v.text);
          t.position.set(p.x, p.y - 0.6);
        }
      }
      if (v.type === 'ruler')
        overlay.addChild(
          graphics(index)
            .moveTo(v.from.x, v.from.y)
            .lineTo(v.to.x, v.to.y)
            .stroke({ width: 0.025, color: 0x173b38 }),
        );
      if (v.type === 'plot' || v.type === 'histogram') {
        const index = (current.visuals ?? []).indexOf(v),
          x = 0.35 + (index % 3) * 5,
          y = 6.8;
        const g = graphics(index).rect(x, y, 4.5, 1.7).fill({ color: 0xffffff, alpha: 0.85 });
        const label = text(index, v.title, 0.18);
        label.position.set(x + 0.1, y + 0.05);

        if (v.type === 'histogram') {
          const bins = state.histograms[v.id] ?? [],
            max = Math.max(1, ...bins);
          bins.forEach((n, i) =>
            g
              .rect(x + 0.1 + (i * 4.2) / v.bins, y + 1.5 - n / max, 4 / v.bins, n / max)
              .fill(0x4d9b8d),
          );
        } else {
          const points = state.plots[v.id] ?? [];
          if (points.length) {
            const min = Math.min(...points.map((p) => p.value)),
              max = Math.max(min + 1, ...points.map((p) => p.value));
            points.forEach((p, i) => {
              const px = x + 0.1 + (i / Math.max(1, points.length - 1)) * 4.2,
                py = y + 1.5 - (p.value - min) / (max - min);
              if (i === 0) g.moveTo(px, py);
              else g.lineTo(px, py);
            });
            g.stroke({ width: 0.025, color: 0x4d9b8d });
          }
        }
      }
      if (v.type === 'numberLine') {
        const g = graphics(index)
          .moveTo(1, 8.5)
          .lineTo(15, 8.5)
          .stroke({ width: 0.025, color: 0x173b38 });
        for (let n = v.from, i = 0; n <= v.to && i < 200; n += v.step, i++) {
          const x = 1 + ((n - v.from) / Math.max(0.001, v.to - v.from)) * 14;
          g.moveTo(x, 8.4).lineTo(x, 8.6).stroke({ width: 0.02, color: 0x173b38 });
        }
        const p = state.entities.find((p) => p.id === v.marker.entity);
        if (p)
          g.circle(1 + ((p.x - v.from) / Math.max(0.001, v.to - v.from)) * 14, 8.5, 0.12).fill(
            0xe85660,
          );
      }
      if (v.type === 'fraction') {
        const g = graphics(index),
          ratio = v.numerator / v.denominator;
        if (v.style === 'bar') {
          for (let n = 0; n < v.denominator; n++)
            g.rect(v.at.x + n * 0.25, v.at.y, 0.24, 0.45).fill(
              n < v.numerator ? 0x4d9b8d : 0xe5ece9,
            );
        } else {
          g.circle(v.at.x, v.at.y, 0.5).fill(0xe5ece9);
          if (ratio > 0)
            g.moveTo(v.at.x, v.at.y)
              .arc(v.at.x, v.at.y, 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
              .lineTo(v.at.x, v.at.y)
              .fill(0x4d9b8d);
        }
      }
      if (v.type === 'stopwatch') {
        const t = text(index, `${(state.stopwatches[index] ?? 0).toFixed(2)} s`, 0.25);
        t.position.set(14, 0.3);
      }
      if (v.type === 'vector') {
        const p = state.entities.find((p) => p.id === v.entity);
        if (p)
          overlay.addChild(
            graphics(index)
              .moveTo(p.x, p.y)
              .lineTo(
                p.x + (v.show === 'gravity' ? 0 : p.vx) * 0.15,
                p.y +
                  (v.show === 'velocity'
                    ? p.vy
                    : v.show === 'gravity'
                      ? state.gravity.y
                      : p.vy + state.gravity.y) *
                    0.15,
              )
              .stroke({ width: 0.04, color: 0xe85660 }),
          );
      }
    }
  };
  app.ticker.add(ticker);
  let held: string | undefined;
  let heldPointer: number | undefined;
  const samples: PointerSample[] = [];
  let last = { x: 0, y: 0, time: 0 };
  const point = (e: PointerEvent) => {
    const r = app.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 16, y: ((e.clientY - r.top) / r.height) * 9 };
  };
  const down = (e: PointerEvent) => {
    const p = point(e);
    const hit = sim
      .snapshot()
      .entities.slice()
      .reverse()
      .find((b) => Math.abs(b.x - p.x) < b.width / 2 && Math.abs(b.y - p.y) < b.height / 2);
    if (hit) {
      if (held) return;
      held = hit.id;
      heldPointer = e.pointerId;
      samples.length = 0;
      recordPointer(samples, { ...p, time: e.timeStamp });
      highlights.set(hit.id, sim.frame().time + 0.3);
      last = { ...p, time: e.timeStamp };
      sim.tap(hit.id, p);
      app.canvas.setPointerCapture(e.pointerId);
    }
  };
  const move = (e: PointerEvent) => {
    if (held && e.pointerId === heldPointer) {
      const p = point(e);
      recordPointer(samples, { ...p, time: e.timeStamp });
      sim.drag(held, p);
      last = { ...p, time: e.timeStamp };
    }
  };
  const releaseCapture = () => {
    if (heldPointer !== undefined && app.canvas.hasPointerCapture(heldPointer))
      app.canvas.releasePointerCapture(heldPointer);
    held = undefined;
    heldPointer = undefined;
    samples.length = 0;
  };
  const up = (e: PointerEvent) => {
    if (held && e.pointerId === heldPointer) {
      recordPointer(samples, { ...point(e), time: e.timeStamp });
      sim.flick(held, pointerVelocity(samples));
      releaseCapture();
    }
  };
  const cancel = (e: PointerEvent) => {
    if (held && e.pointerId === heldPointer) {
      sim.cancelDrag(held);
      releaseCapture();
    }
  };
  app.canvas.addEventListener('pointerdown', down);
  app.canvas.addEventListener('pointermove', move);
  app.canvas.addEventListener('pointerup', up);
  app.canvas.addEventListener('pointercancel', cancel);
  return {
    canvas: app.canvas,
    subscribe: sim.subscribe.bind(sim),
    snapshot: sim.snapshot.bind(sim),
    frame: sim.frame.bind(sim),
    cancelDrag: sim.cancelDrag.bind(sim),
    setCollider: sim.setCollider.bind(sim),
    step: sim.step.bind(sim),
    tap: sim.tap.bind(sim),
    drag: sim.drag.bind(sim),
    flick: sim.flick.bind(sim),
    setDial: sim.setDial.bind(sim),
    setVariable: sim.setVariable.bind(sim),
    castSpell: sim.castSpell.bind(sim),
    reset: sim.reset.bind(sim),
    load(next) {
      sim.load(next);
      current = structuredClone(next);
      void drawAssets();
    },
    update(next) {
      sim.update(next);
      current = structuredClone(next);
      void drawAssets();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      for (const controller of colliderRequests) controller.abort();
      colliderRequests.clear();
      observer.disconnect();
      unsubscribe();
      app.ticker.remove(ticker);
      app.canvas.removeEventListener('pointerdown', down);
      app.canvas.removeEventListener('pointermove', move);
      app.canvas.removeEventListener('pointerup', up);
      app.canvas.removeEventListener('pointercancel', cancel);
      sim.dispose();
      app.destroy(true, { children: true });
      textures.dispose();
    },
  };
}
