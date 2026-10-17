import { Application, Container, Sprite, Text, MeshPlane, Texture, Rectangle } from 'pixi.js';
import { initialMotion, advanceMotion, motionFrame, wheelAngle, type MotionState } from './motion';
import { WorldGraphics as Graphics } from './world-graphics';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { readBoundedJson } from './bounded-json';
import { placeholder, playSurface } from './placeholder';
import { SoundCues } from './sound';
import { TextureLease, OpaqueOverlayError } from './textures';
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

  const root = new Container();
  const background = new Container(),
    entities = new Container(),
    overlay = new Container();
  root.addChild(background, entities, overlay);
  const meshes = new Map<string, MeshPlane>();
  const textures = new TextureLease();
  const sounds = new SoundCues();
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
      t = new Text({
        text: value,
        resolution: 2,
        style: {
          fontFamily: 'Nunito, sans-serif',
          fontWeight: '700',
          fontSize: 48,
          fill: 0x243e36,
        },
      });
      visualTexts.set(index, t);
      overlay.addChild(t);
    }
    t.visible = true;
    // The scene uses metres; learning annotations still need a readable screen size.
    const readableSize = Math.max(size, (13 * 16) / Math.max(1, element.clientWidth));
    t.scale.set(readableSize / 48);
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
  const sources = new Map<string, SceneDoc['entities'][number]>();
  const viewKeys = new Map<string, string>();
  const backgrounds = new Map<number, { key: string; slot: Container }>();
  const colliderApplied = new Map<string, string>();
  const colliderCache = new Map<
    string,
    { controller: AbortController; promise: Promise<unknown> }
  >();
  let visualKey = '';
  let surface = playSurface(current);
  background.addChild(surface);
  const trail = new Graphics();
  overlay.addChild(trail);
  const trailPoints: { x: number; y: number; time: number }[] = [];
  let lastTrailTime = 0;
  const sprites = new Map<string, Container>();
  const locomotion = new Map<string, MotionState>();
  const atlases = new Map<string, { sprite: Sprite; frames: Texture[] }>();
  const wheelRigs = new Map<string, Graphics[]>();
  const releaseAtlas = (id: string) => {
    for (const frame of atlases.get(id)?.frames ?? []) frame.destroy(false);
    atlases.delete(id);
    wheelRigs.delete(id);
    locomotion.delete(id);
  };
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
  const unsubscribe = sim.subscribe((event) => {
    onEvent?.(event);
    if (event.type === 'celebrate' || event.type === 'sound') {
      const cue =
        typeof event.value === 'object' && event.value !== null
          ? (event.value as { style?: string; cue?: string })
          : {};
      if (event.type === 'sound' && cue.cue) sounds.play(cue.cue);
      const hero =
        sim.frame().entities.find((p) => p.id === current.learning.heroEntityId) ??
        sim.frame().entities.find((p) => p.templateId === current.learning.heroEntityId);
      const at = hero ?? { x: 8, y: 4.5 },
        style =
          cue.style ??
          (typeof event.value === 'string'
            ? event.value
            : cue.cue === 'splash'
              ? 'splash'
              : 'sparkle');
      for (let i = 0; i < (event.type === 'sound' ? 8 : 24); i++) {
        const particle = particles[particleIndex++ % particles.length]!;
        particle.until = event.time + 0.9;
        particle.g.position.set(
          at.x + Math.cos(i * 2.4) * (0.2 + i * 0.035),
          at.y + Math.sin(i * 2.4) * (0.2 + i * 0.035),
        );
        particle.g.tint =
          style === 'splash'
            ? 0x55cbed
            : style === 'confetti'
              ? [0xe95f8c, 0x6dcab7, 0xffcc66][i % 3]!
              : 0xffdc77;
        particle.g.visible = true;
      }
    }
  });
  const resize = () => {
    const width = element.clientWidth || 960;
    const height = (width * 9) / 16;
    app.renderer.resize(width, height);
    root.scale.set(width / 16);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  function viewSource(p: { id: string; templateId?: string }) {
    return current.entities.find((e) => e.id === (p.templateId ?? p.id)) ?? sources.get(p.id);
  }
  function sourceKey(e: SceneDoc['entities'][number]) {
    return JSON.stringify([e.asset?.url, e.asset?.colliderUrl, e.asset?.status]);
  }
  function drawEntity(e: SceneDoc['entities'][number], id: string) {
    sources.set(id, e);
    const key = JSON.stringify([e.asset, e.body, e.kind, e.tags, e.locomotion]);
    const existing = sprites.get(id);
    if (existing && viewKeys.get(id) === key) return;
    existing?.destroy({ children: true });
    releaseAtlas(id);
    meshes.delete(id);
    const c = new Container();
    const g = placeholder(e);
    c.addChild(g);
    entities.addChild(c);
    sprites.set(id, c);
    viewKeys.set(id, key);
    if (e.asset?.status === 'ready')
      void textures
        .acquire(e.asset.url)
        .then((texture) => {
          if (disposed || sprites.get(id) !== c || c.destroyed) return;
          const soft =
            !e.asset?.animation && !!sim.frame().entities.find((p) => p.id === id)?.nodes;
          const sprite = soft
            ? new MeshPlane({ texture, verticesX: 3, verticesY: 3 })
            : new Sprite(texture);
          if (sprite instanceof MeshPlane) meshes.set(id, sprite);
          else {
            sprite.anchor.set(0.5);
            sprite.width = e.body.size.width;
            sprite.height = e.body.size.height;
          }
          c.removeChild(g);
          g.destroy();
          c.addChild(sprite);
          if (sprite instanceof Sprite && e.asset?.animation) {
            const a = e.asset.animation,
              width = texture.width / a.columns,
              height = texture.height / a.rows;
            const frames = Array.from(
              { length: a.frames },
              (_, index) =>
                new Texture({
                  source: texture.source,
                  frame: new Rectangle(
                    (index % a.columns) * width,
                    Math.floor(index / a.columns) * height,
                    width,
                    height,
                  ),
                }),
            );
            sprite.texture = frames[0]!;
            const scale = Math.min(
              e.body.size.width / (width * (a.content?.width ?? 1)),
              e.body.size.height / (height * (a.content?.height ?? 1)),
            );
            sprite.width = width * scale;
            sprite.height = height * scale;
            sprite.anchor.set(a.anchor?.x ?? 0.5, a.anchor?.y ?? 0.5);
            if (a.anchor && a.anchor.y > 0.5) sprite.position.set(0, e.body.size.height / 2);
            atlases.set(id, { sprite, frames });
          }
          if (e.locomotion?.kind === 'roll' && e.locomotion.wheels) {
            const wheels = e.locomotion.wheels.map((w) => {
              const radius = w.radius * e.body.size.width;
              const wheel = new Graphics()
                .circle(0, 0, radius)
                .fill(0x243e36)
                .circle(0, 0, radius * 0.67)
                .fill(0xe9e1ce);
              for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3;
                wheel
                  .moveTo(0, 0)
                  .lineTo(Math.cos(angle) * radius * 0.6, Math.sin(angle) * radius * 0.6)
                  .stroke({ width: radius * 0.17, color: 0x687c70 });
              }
              wheel.position.set(w.x * e.body.size.width, w.y * e.body.size.height);
              c.addChild(wheel);
              return wheel;
            });
            wheelRigs.set(id, wheels);
          }
        })
        .catch(() => {
          if (sprites.get(id) === c) viewKeys.delete(id);
        });
  }
  function loadCollider(id: string, e: SceneDoc['entities'][number]) {
    const url = e.asset?.colliderUrl;
    if (!url || e.asset?.status !== 'ready' || e.body.shape !== 'auto') return;
    const key = sourceKey(e);
    if (colliderApplied.get(id) === key) return;
    colliderApplied.set(id, key);
    let cached = colliderCache.get(url);
    if (!cached) {
      const controller = new AbortController();
      const promise = (async () => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Collider unavailable');
        return readBoundedJson(response, controller);
      })();
      cached = { controller, promise };
      colliderCache.set(url, cached);
      void promise.catch(() => {
        if (colliderCache.get(url)?.promise === promise) colliderCache.delete(url);
      });
    }
    void cached.promise
      .then((value) => {
        if (disposed || colliderApplied.get(id) !== key) return;
        const p = sim.frame().entities.find((p) => p.id === id);
        const source = p && viewSource(p);
        if (source && sourceKey(source) === key && !sim.setCollider(id, value))
          colliderApplied.delete(id);
      })
      .catch(() => {
        if (colliderApplied.get(id) === key) colliderApplied.delete(id);
      });
  }
  function drawAssets() {
    const poses = sim.frame().entities,
      live = new Set(poses.map((p) => p.id));
    for (const [id, c] of sprites)
      if (!live.has(id)) {
        c.destroy({ children: true });
        sprites.delete(id);
        releaseAtlas(id);
        meshes.delete(id);
        viewKeys.delete(id);
        colliderApplied.delete(id);
        highlights.delete(id);
        sources.delete(id);
      }
    const urls = new Set<string>(),
      colliders = new Set<string>();
    for (const e of current.entities) if (e.asset?.status === 'ready') urls.add(e.asset.url);
    for (const [index, asset] of [current.theme.backdrop, current.theme.midLayer].entries()) {
      const key = JSON.stringify(asset),
        prior = backgrounds.get(index);
      if (asset?.status === 'ready') urls.add(asset.url);
      if (prior?.key === key) continue;
      prior?.slot.destroy({ children: true });
      const slot = new Container();
      background.addChild(slot);
      backgrounds.set(index, { key, slot });
      if (asset?.status === 'ready')
        void (index === 1 ? textures.acquireOverlay(asset.url) : textures.acquire(asset.url))
          .then((texture) => {
            if (disposed || backgrounds.get(index)?.slot !== slot) return;
            const sprite = new Sprite(texture);
            sprite.width = 16;
            sprite.height = 9;
            slot.addChild(sprite);
          })
          .catch((error) => {
            // Immutable opaque legacy mid-layers remain hidden; do not retry every frame.
            if (error instanceof OpaqueOverlayError) return;
            if (backgrounds.get(index)?.slot === slot) backgrounds.get(index)!.key = '';
          });
    }
    background.addChild(
      ...[...backgrounds].sort(([a], [b]) => a - b).map(([, value]) => value.slot),
    );
    for (const p of poses) {
      const e = viewSource(p);
      if (!e) continue;
      if (e.asset?.status === 'ready') urls.add(e.asset.url);
      drawEntity(e, p.id);
      if (e.asset?.colliderUrl) {
        colliders.add(e.asset.colliderUrl);
        loadCollider(p.id, e);
      }
    }
    for (const [url, cached] of colliderCache)
      if (!colliders.has(url)) {
        cached.controller.abort();
        colliderCache.delete(url);
      }
    textures.retain(urls);
    const nextVisualKey = JSON.stringify(current.visuals);
    if (nextVisualKey !== visualKey) {
      visualKey = nextVisualKey;
      for (const g of visualGraphics.values()) g.destroy();
      for (const t of visualTexts.values()) t.destroy();
      visualGraphics.clear();
      visualTexts.clear();
    }
  }
  drawAssets();

  const ticker = () => {
    if (disposed) return;
    const displayDt = app.ticker.deltaMS / 1000;
    // Pixi caps deltaMS, so use elapsedMS to recognize a genuinely suspended tab.
    const paused =
      globalThis.document?.hidden || (app.ticker.elapsedMS ?? app.ticker.deltaMS) > 150;
    if (!paused) sim.advance(Math.min(0.1, displayDt));
    const state = sim.frame();
    // Physics runs at 60Hz. Presentation must also advance on the display frames
    // between physics ticks, including 120Hz displays and slow-motion worlds.
    const motionDt = paused ? 1 : displayDt * state.timeScale;
    trail.clear();
    if (state.time < lastTrailTime) trailPoints.length = 0;
    const trailHero = state.entities.find((p) => p.id === current.learning.heroEntityId);
    if (trailHero && current.entities.find((e) => e.id === trailHero.id)?.tags.includes('trail')) {
      if (state.time - lastTrailTime > 0.035) {
        trailPoints.push({ x: trailHero.x, y: trailHero.y, time: state.time });
        lastTrailTime = state.time;
      }
      while (trailPoints.length > 64 || (trailPoints[0] && state.time - trailPoints[0].time > 2))
        trailPoints.shift();
      for (const [i, p] of trailPoints.entries())
        trail
          .circle(p.x, p.y, 0.045)
          .fill({ color: 0xc16b41, alpha: ((i + 1) / trailPoints.length) * 0.65 });
    }
    for (const p of state.entities)
      if (!sprites.has(p.id)) {
        const source = viewSource(p);
        if (source) {
          drawEntity(source, p.id);
          loadCollider(p.id, source);
        }
      }
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
        releaseAtlas(id);
        meshes.delete(id);
        highlights.delete(id);
        viewKeys.delete(id);
        colliderApplied.delete(id);
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
        const old = state.previousEntities.find((e) => e.id === p.id) ?? p,
          alpha = state.interpolation;
        const displayed = { x: old.x + (p.x - old.x) * alpha, y: old.y + (p.y - old.y) * alpha };
        c.position.set(displayed.x, displayed.y);
        const turn = Math.atan2(
          Math.sin(p.rotation - old.rotation),
          Math.cos(p.rotation - old.rotation),
        );
        c.rotation = old.rotation + turn * alpha;
        c.alpha = (highlights.get(p.id) ?? 0) > state.time ? 0.6 : 1;
        let mesh = meshes.get(p.id);
        if (p.nodes && !mesh && !atlases.has(p.id)) {
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
        const original = viewSource(p);
        if (original && !mesh)
          c.scale.set(p.width / original.body.size.width, p.height / original.body.size.height);
        if (original?.locomotion && !mesh) {
          const definition = original.locomotion;
          const prior = locomotion.get(p.id) ?? initialMotion(displayed);
          const next = advanceMotion(
            prior,
            displayed,
            displayDt > 0.15 ? displayDt : motionDt,
            definition,
          );
          if ((definition.kind === 'run' || definition.kind === 'walk') && p.grounded === false) {
            next.moving = false;
            next.phase = prior.phase;
            next.distance = prior.distance;
          }
          locomotion.set(p.id, next);
          if (definition.kind !== 'roll') {
            c.scale.x *= next.facing * (definition.facing === 'left' ? -1 : 1);
            c.rotation += next.tilt;
          }
          const atlas = atlases.get(p.id);
          if (atlas) atlas.sprite.texture = atlas.frames[motionFrame(next, atlas.frames.length)]!;
          for (const [index, wheel] of (wheelRigs.get(p.id) ?? []).entries())
            wheel.rotation = wheelAngle(next, definition.wheels![index]!.radius * p.width);
        }
        for (const behavior of original?.behaviors ?? []) {
          if (behavior.type === 'glow') c.tint = Number.parseInt(behavior.color.slice(1), 16);
          if (behavior.type === 'face') {
            if (original?.locomotion) continue;
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
      if (v.type === 'ruler') {
        const dx = v.to.x - v.from.x,
          dy = v.to.y - v.from.y,
          length = Math.hypot(dx, dy);
        const g = graphics(index)
          .moveTo(v.from.x, v.from.y)
          .lineTo(v.to.x, v.to.y)
          .stroke({ width: 0.025, color: 0x245e4e });
        for (let n = 0; n <= length && length > 0; n++) {
          const x = v.from.x + (dx * n) / length,
            y = v.from.y + (dy * n) / length;
          g.moveTo(x, y - 0.08)
            .lineTo(x, y + 0.08)
            .stroke({ width: 0.025, color: 0x245e4e });
        }
        const label = text(index, `${Number(length.toFixed(2))} m`, 0.3);
        label.position.set(
          (v.from.x + v.to.x) / 2 - label.width / 2,
          (v.from.y + v.to.y) / 2 + 0.12,
        );
      }
      if (v.type === 'plot' || v.type === 'histogram') {
        const index = (current.visuals ?? []).indexOf(v),
          x = 0.35 + (index % 3) * 5,
          y = 0.65;
        const label = text(index, v.title, 0.28);
        label.position.set(x + 0.1, y + 0.05);
        const plotWidth = Math.max(4.2, label.width),
          plotBottom = y + Math.max(1.5, label.height + 1.2);
        const g = graphics(index)
          .roundRect(x, y, plotWidth + 0.3, plotBottom - y + 0.2, 0.16)
          .fill({ color: 0xfff9ee, alpha: 0.95 });
        // Keep the title above both the plot and its backing panel.
        overlay.addChild(label);

        if (v.type === 'histogram') {
          const bins = state.histograms[v.id] ?? [],
            max = Math.max(1, ...bins);
          bins.forEach((n, i) =>
            g
              .rect(
                x + 0.1 + (i * plotWidth) / v.bins,
                plotBottom - n / max,
                (plotWidth - 0.2) / v.bins,
                n / max,
              )
              .fill(0x4d9b8d),
          );
        } else {
          const points = state.plots[v.id] ?? [];
          if (points.length) {
            const min = Math.min(...points.map((p) => p.value)),
              max = Math.max(min + 1, ...points.map((p) => p.value));
            points.forEach((p, i) => {
              const px = x + 0.1 + (i / Math.max(1, points.length - 1)) * plotWidth,
                py = plotBottom - (p.value - min) / (max - min);
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
            g.rect(v.at.x + n * 0.8, v.at.y, 0.76, 0.6).fill(n < v.numerator ? 0x4d9b8d : 0xe5ece9);
        } else {
          g.circle(v.at.x, v.at.y, 0.65).fill(0xe5ece9);
          if (ratio > 0)
            g.moveTo(v.at.x, v.at.y)
              .arc(v.at.x, v.at.y, 0.65, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
              .lineTo(v.at.x, v.at.y)
              .fill(0x4d9b8d);
        }
      }
      if (v.type === 'fraction')
        text(index, `${v.numerator}/${v.denominator}`, 0.38).position.set(
          v.at.x + (v.style === 'bar' ? 0.45 : -0.25),
          v.at.y + 0.8,
        );
      if (v.type === 'stopwatch') {
        const t = text(index, `${(state.stopwatches[index] ?? 0).toFixed(2)} s`, 0.25);
        t.position.set(15.65 - t.width, 0.3);
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
  let dragging = false;
  let downAt = { x: 0, y: 0 };
  // A press on empty stage becomes a target-less tap (games use the coordinates).
  let stagePress: { pointerId: number; x: number; y: number } | undefined;
  const samples: PointerSample[] = [];
  let last = { x: 0, y: 0, time: 0 };
  const point = (e: PointerEvent) => {
    const r = app.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 16, y: ((e.clientY - r.top) / r.height) * 9 };
  };
  const hitAt = (p: { x: number; y: number }) =>
    sim
      .frame()
      .entities.slice()
      .reverse()
      .find((b) => {
        const source = viewSource(b);
        if (
          !source ||
          (source.body.isStatic &&
            !source.character &&
            !current.rules.some(
              (r) =>
                r.when.event === 'tap' &&
                (r.when.target === source.id || source.tags.includes(r.when.target)),
            ))
        )
          return false;
        const touch = (22 * 16) / (element.clientWidth || 960);
        return (
          Math.abs(b.x - p.x) <= Math.max(b.width / 2, touch) &&
          Math.abs(b.y - p.y) <= Math.max(b.height / 2, touch)
        );
      });
  const down = (e: PointerEvent) => {
    sounds.unlock();
    const p = point(e);
    const hit = hitAt(p);
    if (hit) {
      if (held) return;
      held = hit.id;
      dragging = false;
      downAt = p;
      heldPointer = e.pointerId;
      samples.length = 0;
      recordPointer(samples, { ...p, time: e.timeStamp });
      highlights.set(hit.id, sim.frame().time + 0.3);
      last = { ...p, time: e.timeStamp };
      app.canvas.setPointerCapture(e.pointerId);
    } else if (!held) stagePress = { pointerId: e.pointerId, ...p };
  };
  const move = (e: PointerEvent) => {
    const pointer = point(e);
    last = { ...pointer, time: e.timeStamp };
    app.canvas.style.cursor = held ? 'grabbing' : hitAt(pointer) ? 'grab' : 'default';
    if (held && e.pointerId === heldPointer) {
      const p = point(e);
      recordPointer(samples, { ...p, time: e.timeStamp });
      const source = viewSource({ id: held });
      if (
        source &&
        !source.body.isStatic &&
        (Math.hypot(p.x - downAt.x, p.y - downAt.y) * (element.clientWidth || 960)) / 16 > 6
      )
        dragging = true;
      if (dragging) sim.drag(held, p);
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
    if (stagePress && e.pointerId === stagePress.pointerId) {
      const p = point(e);
      if (
        (Math.hypot(p.x - stagePress.x, p.y - stagePress.y) * (element.clientWidth || 960)) / 16 <=
        6
      )
        sim.tap('', p);
      stagePress = undefined;
    }
    if (held && e.pointerId === heldPointer) {
      recordPointer(samples, { ...point(e), time: e.timeStamp });
      if (dragging) sim.flick(held, pointerVelocity(samples));
      else sim.tap(held, point(e));
      releaseCapture();
    }
  };
  const cancel = (e: PointerEvent) => {
    if (stagePress?.pointerId === e.pointerId) stagePress = undefined;
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
    advance: sim.advance.bind(sim),
    tap(target, at) {
      sounds.unlock();
      sim.tap(target, at);
    },
    drag: sim.drag.bind(sim),
    flick: sim.flick.bind(sim),
    impulse: sim.impulse.bind(sim),
    move: sim.move.bind(sim),
    setGravity: sim.setGravity.bind(sim),
    setWind: sim.setWind.bind(sim),
    setMaterial: sim.setMaterial.bind(sim),
    spawn: sim.spawn.bind(sim),
    remove: sim.remove.bind(sim),
    celebrate: sim.celebrate.bind(sim),
    setDial: sim.setDial.bind(sim),
    setVariable: sim.setVariable.bind(sim),
    castSpell: sim.castSpell.bind(sim),
    reset() {
      sim.reset();
      locomotion.clear();
      colliderApplied.clear();
      drawAssets();
    },
    load(next) {
      sim.load(next);
      locomotion.clear();
      colliderApplied.clear();
      current = structuredClone(next);
      surface.destroy();
      surface = playSurface(current);
      background.addChild(surface);
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
      for (const cached of colliderCache.values()) cached.controller.abort();
      colliderCache.clear();
      colliderApplied.clear();
      viewKeys.clear();
      backgrounds.clear();
      sources.clear();
      observer.disconnect();
      unsubscribe();
      sounds.dispose();
      app.ticker.remove(ticker);
      app.canvas.removeEventListener('pointerdown', down);
      app.canvas.removeEventListener('pointermove', move);
      app.canvas.removeEventListener('pointerup', up);
      app.canvas.removeEventListener('pointercancel', cancel);
      sim.dispose();
      app.destroy(true, { children: true });
      for (const id of atlases.keys()) releaseAtlas(id);
      textures.dispose();
    },
  };
}
