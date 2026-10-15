import { parseCollider } from './collider';
import RAPIER from '@dimforge/rapier2d-compat';
import type {
  SceneDoc,
  Entity,
  Vec2,
  Action,
  Dial,
  Concept,
  Material,
} from '@just-imagine/scene-schema';
export type Spell =
  | 'reverseGravity'
  | 'slowTime'
  | 'slowMotion'
  | 'grow'
  | 'shrink'
  | 'floatAll'
  | 'float'
  | 'restore';
export interface EngineEvent {
  type: string;
  time: number;
  ruleId?: string;
  concept?: Concept;
  say?: string;
  target?: string;
  value?: unknown;
}
export interface Pose {
  id: string;
  x: number;
  y: number;
  rotation: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  nodes?: Vec2[];
  templateId?: string;
}
export interface Simulation {
  load(doc: SceneDoc): void;
  update(doc: SceneDoc): void;
  step(frames?: number): void;
  advance(seconds: number): void;
  tap(target: string, at?: Vec2): void;
  drag(target: string, at: Vec2): void;
  flick(target: string, velocity: Vec2): void;
  setDial(dial: Dial, value: string): void;
  setVariable(id: string, value: number): void;
  castSpell(spell: Spell, target?: string): void;
  reset(): void;
  dispose(): void;
  snapshot(): SimulationSnapshot;
  frame(): SimulationFrame;
  cancelDrag(target: string): void;
  setCollider(target: string, value: unknown): boolean;
  subscribe(listener: (event: EngineEvent) => void): () => void;
}
export type SimulationFrame = Omit<SimulationSnapshot, 'history' | 'inputs'> & {
  previousEntities: Pose[];
  interpolation: number;
};
export interface SimulationSnapshot {
  time: number;
  timeScale: number;
  gravity: Vec2;
  entities: Pose[];
  variables: Record<string, number>;
  history: { time: number; entities: Pose[] }[];
  plots: Record<string, { time: number; value: number }[]>;
  histograms: Record<string, number[]>;
  challenges: string[];
  stopwatches: Record<number, number>;
  inputs: EngineEvent[];
}
let initialized: Promise<void> | undefined;
export async function createSimulation(doc: SceneDoc): Promise<Simulation> {
  initialized ??= RAPIER.init();
  await initialized;
  return new Runtime(doc);
}
class Runtime implements Simulation {
  private doc!: SceneDoc;
  private world!: RAPIER.World;
  private queue!: RAPIER.EventQueue;
  private colliderParts = new Map<string, Vec2[][]>();
  private documentJoints: RAPIER.ImpulseJoint[] = [];
  private removed = new Set<string>();
  private effectiveMaterials = new Map<string, Material>();
  private holds = new Map<string, Vec2>();
  private anchors = new Map<string, RAPIER.RigidBody>();
  private landingSamples = new Map<string, number[]>();
  private landed = new Map<string, Set<string>>();
  private supported = new Set<string>();
  private templates = new Map<string, string>();
  private collisionRuleContacts = new Map<string, Set<string>>();
  private bodies = new Map<string, RAPIER.RigidBody>();
  private lattices = new Map<string, RAPIER.RigidBody[]>();
  private entities = new Map<string, Entity>();
  private colliderIds = new Map<number, string>();
  private listeners = new Set<(event: EngineEvent) => void>();
  private fired = new Set<string>();
  private completed = new Set<string>();
  private submerged = new Set<string>();
  private disposed = false;
  private seed = 0;
  private serial = 0;
  private lastSummaries = new Map<string, number>();
  private time = 0;
  private ticks = 0;
  private pendingTicks = 0;
  private previousPoses: Pose[] = [];
  private watches = new Map<number, { start: number; stop?: number }>();
  private timeScale = 1;
  private wind = { x: 0, y: 0 };
  private gravity = { x: 0, y: 0 };
  private variables: Record<string, number> = {};
  private history: SimulationSnapshot['history'] = [];
  private plots: SimulationSnapshot['plots'] = {};
  private histograms: SimulationSnapshot['histograms'] = {};
  private inputs: EngineEvent[] = [];
  private launches = new Map<string, { speed: number; angle: number }>();
  private scales = new Map<string, number>();
  private pointer = { x: 8, y: 4.5 };
  private floatOverride = false;
  private spellBaseline:
    { gravity: Vec2; timeScale: number; scales: Map<string, number> } | undefined;
  constructor(doc: SceneDoc) {
    this.load(doc);
  }
  private alive() {
    if (this.disposed) throw new Error('Simulation disposed');
  }
  subscribe(fn: (event: EngineEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit(event: Omit<EngineEvent, 'time'>) {
    const e = { ...event, time: this.time };
    for (const fn of this.listeners) fn(e);
  }
  private input(type: string, target?: string, value?: unknown) {
    this.inputs.push({ type, time: this.time, ...(target ? { target } : {}), value });
    if (this.inputs.length > 2000) this.inputs.shift();
    const interval = type === 'variable' ? 300 : type === 'drag' ? 500 : 0;
    const key = `${type}:${target ?? ''}`;
    const now = Date.now();
    if (!interval || now - (this.lastSummaries.get(key) ?? -Infinity) >= interval) {
      this.emit({ type, ...(target ? { target } : {}), value });
      this.lastSummaries.set(key, now);
    }
    (this.doc.visuals ?? []).forEach((v, i) => {
      if (v.type === 'stopwatch' && v.startOn === type) this.watches.set(i, { start: this.time });
    });
  }
  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  load(doc: SceneDoc) {
    this.alive();
    this.world?.free();
    this.queue?.free();
    this.doc = structuredClone(doc);
    this.bodies.clear();
    this.templates.clear();
    this.collisionRuleContacts.clear();
    this.documentJoints = [];
    this.colliderParts.clear();
    this.removed.clear();
    this.effectiveMaterials.clear();
    this.holds.clear();
    this.anchors.clear();
    this.landingSamples.clear();
    this.landed.clear();
    this.supported.clear();
    this.lattices.clear();
    this.entities.clear();
    this.colliderIds.clear();
    this.fired.clear();
    this.completed.clear();
    this.submerged.clear();
    this.launches.clear();
    this.scales.clear();
    this.variables = {};
    this.history = [];
    this.plots = {};
    this.histograms = {};
    this.inputs = [];
    this.time = 0;
    this.ticks = 0;
    this.pendingTicks = 0;
    this.previousPoses = [];
    this.watches.clear();
    this.timeScale = 1;
    this.seed = doc.environment.seed;
    this.serial = 0;
    this.lastSummaries.clear();
    this.floatOverride = false;
    this.spellBaseline = undefined;
    this.gravity =
      doc.environment.medium === 'space' ? { x: 0, y: 0 } : { ...doc.environment.gravity };
    this.wind = { ...doc.environment.wind };
    this.world = new RAPIER.World(this.gravity);
    this.world.timestep = 1 / 60;
    this.queue = new RAPIER.EventQueue(true);
    for (const e of doc.entities) this.add(e);
    const { width, height } = doc.environment.bounds;
    for (const [x, y, w, h] of [
      [width / 2, height + 0.1, width, 0.2],
      [width / 2, -0.1, width, 0.2],
      [-0.1, height / 2, 0.2, height],
      [width + 0.1, height / 2, 0.2, height],
    ])
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(w! / 2, h! / 2).setTranslation(x!, y!));
    this.reconcileJoints();
    for (const [id, v] of Object.entries(doc.variables ?? {})) this.setVariable(id, v.value);
    this.previousPoses = this.poses();
  }
  private reconcileJoints() {
    for (const joint of this.documentJoints)
      if (this.world.impulseJoints.contains(joint.handle))
        this.world.removeImpulseJoint(joint, true);
    this.documentJoints = [];
    for (const j of this.doc.joints) {
      const a = this.bodies.get(j.a),
        b = this.bodies.get(j.b);
      if (!a || !b) continue;
      const local = (id: string, body: RAPIER.RigidBody) => {
        const original = this.doc.entities.find((e) => e.id === id);
        const p = original?.transform ?? { ...body.translation(), rotation: body.rotation() };
        const anchor = j.type === 'pin' ? j.anchor : { x: p.x, y: p.y };
        const dx = anchor.x - p.x,
          dy = anchor.y - p.y,
          c = Math.cos(p.rotation),
          sn = Math.sin(p.rotation);
        return { x: dx * c + dy * sn, y: -dx * sn + dy * c };
      };
      const data =
        j.type === 'spring'
          ? RAPIER.JointData.spring(
              j.restLength,
              j.stiffness,
              j.damping,
              { x: 0, y: 0 },
              { x: 0, y: 0 },
            )
          : RAPIER.JointData.revolute(local(j.a, a), local(j.b, b));
      this.documentJoints.push(this.world.createImpulseJoint(data, a, b, true));
    }
  }
  private remove(id: string, tombstone = false) {
    const b = this.bodies.get(id);
    if (!b) return;
    if (tombstone && this.doc.entities.some((e) => e.id === id)) this.removed.add(id);
    for (const node of this.lattices.get(id) ?? [b]) {
      for (let i = 0; i < node.numColliders(); i++)
        this.colliderIds.delete(node.collider(i).handle);
      this.world.removeRigidBody(node);
    }
    this.lattices.delete(id);
    this.bodies.delete(id);
    this.entities.delete(id);
    this.templates.delete(id);
    for (const key of this.collisionRuleContacts.keys())
      if (key.split(':').includes(id)) this.collisionRuleContacts.delete(key);
    this.scales.delete(id);
    this.launches.delete(id);
    this.submerged.delete(id);
    this.effectiveMaterials.delete(id);
    this.cancelDrag(id);
    this.supported.delete(id);
    this.colliderParts.delete(id);
    this.spellBaseline?.scales.delete(id);
    for (const set of this.landed.values()) set.delete(id);
  }
  private rebuild(id: string, entity: Entity, keepPose = true) {
    const old = this.bodies.get(id),
      e = structuredClone(entity),
      velocity = old?.linvel(),
      angular = old?.angvel(),
      scale = this.scales.get(id),
      launch = this.launches.get(id),
      material = this.effectiveMaterials.get(id),
      hold = this.holds.get(id),
      template = this.templates.get(id),
      parts = this.colliderParts.get(id),
      baseline = this.spellBaseline?.scales.get(id),
      landed = [...this.landed].filter(([, set]) => set.has(id)).map(([key]) => key);
    if (old && keepPose) e.transform = { ...old.translation(), rotation: old.rotation() };
    this.remove(id);
    if (scale !== undefined) this.scales.set(id, scale);
    if (launch) this.launches.set(id, launch);
    if (material) this.effectiveMaterials.set(id, material);

    if (parts) this.colliderParts.set(id, parts);
    this.add(e);
    if (template) this.templates.set(id, template);
    if (baseline !== undefined) this.spellBaseline?.scales.set(id, baseline);
    for (const key of landed) this.landed.get(key)?.add(id);
    if (hold) this.drag(id, hold);
    if (velocity) {
      for (const node of this.lattices.get(id) ?? [this.bodies.get(id)!]) {
        node.setLinvel(velocity, true);
        node.setAngvel(angular ?? 0, true);
      }
    }
  }
  private nodes(id: string) {
    return this.lattices.get(id) ?? (this.bodies.has(id) ? [this.bodies.get(id)!] : []);
  }
  private area(e: Entity, scale = 1) {
    const w = e.body.size.width * scale,
      h = e.body.size.height * scale;
    if (e.body.shape === 'circle') return Math.PI * (Math.min(w, h) / 2) ** 2;
    if (e.body.shape === 'polygon' && e.body.vertices) {
      const vs = e.body.vertices;
      return (
        (Math.abs(
          vs.reduce((sum, v, i) => {
            const next = vs[(i + 1) % vs.length]!;
            return sum + v.x * next.y - next.x * v.y;
          }, 0),
        ) /
          2) *
        scale *
        scale
      );
    }
    return w * h;
  }
  private nodeDensity(e: Entity, density: number, scale = 1) {
    const radius = (Math.min(e.body.size.width, e.body.size.height) * scale) / 8;
    return (density * this.area(e, scale)) / (9 * Math.PI * radius * radius);
  }
  private impulse(id: string, impulse: Vec2) {
    const nodes = this.nodes(id),
      mass = nodes.reduce((sum, n) => sum + n.mass(), 0);
    for (const n of nodes)
      if (n.isDynamic())
        n.applyImpulse(
          { x: (impulse.x * n.mass()) / mass, y: (impulse.y * n.mass()) / mass },
          true,
        );
  }
  private add(entity: Entity) {
    if (this.entities.size >= 24) return;
    const e = structuredClone(entity);
    this.entities.set(e.id, e);
    const desc = (e.body.isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(e.transform.x, e.transform.y)
      .setRotation(e.transform.rotation)
      .setCcdEnabled(true);
    const b = this.world.createRigidBody(desc);
    let c: RAPIER.ColliderDesc;
    const scale = this.scales.get(e.id) ?? 1;
    const w = e.body.size.width * scale,
      h = e.body.size.height * scale;
    const m =
      this.effectiveMaterials.get(e.id) ?? structuredClone(this.doc.materials[e.body.material]!);
    this.effectiveMaterials.set(e.id, m);
    const soft = m.softness > 0.2 && !e.body.isStatic && e.kind !== 'water';
    if (e.body.shape === 'polygon' && e.body.vertices) {
      c =
        RAPIER.ColliderDesc.convexHull(
          new Float32Array(e.body.vertices.flatMap((v) => [v.x * scale, v.y * scale])),
        ) ?? RAPIER.ColliderDesc.cuboid(w / 2, h / 2);
    } else
      c =
        e.body.shape === 'circle'
          ? RAPIER.ColliderDesc.ball(Math.min(w, h) / 2)
          : RAPIER.ColliderDesc.cuboid(w / 2, h / 2);
    if (soft) c = RAPIER.ColliderDesc.ball(Math.min(w, h) / 8);
    c.setDensity(soft ? this.nodeDensity(e, m.density, scale) : m.density)
      .setFriction(m.friction)
      .setRestitution(m.restitution)
      .setSensor(e.kind === 'water')
      .setActiveEvents(
        RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS,
      )
      .setContactForceEventThreshold(0);
    const collider = this.world.createCollider(c, b);
    this.colliderIds.set(collider.handle, e.id);
    this.bodies.set(e.id, b);
    const parts = this.colliderParts.get(e.id);
    if (parts && !soft && e.body.shape === 'auto') {
      this.colliderIds.delete(collider.handle);
      this.world.removeCollider(collider, true);
      for (const part of parts) {
        const desc = RAPIER.ColliderDesc.convexHull(
          new Float32Array(part.flatMap((p) => [p.x * w, p.y * h])),
        );
        if (!desc) continue;
        desc
          .setDensity(m.density)
          .setFriction(m.friction)
          .setRestitution(m.restitution)
          .setSensor(e.kind === 'water')
          .setActiveEvents(
            RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS,
          )
          .setContactForceEventThreshold(0);
        const child = this.world.createCollider(desc, b);
        this.colliderIds.set(child.handle, e.id);
      }
    }
    if (soft) {
      const nodes: RAPIER.RigidBody[] = [];
      const radius = Math.min(w, h) / 8;
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) {
            nodes.push(b);
            continue;
          }
          const dx = ((col - 1) * w) / 2,
            dy = ((row - 1) * h) / 2;
          const node = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
              .setTranslation(
                e.transform.x +
                  dx * Math.cos(e.transform.rotation) -
                  dy * Math.sin(e.transform.rotation),
                e.transform.y +
                  dx * Math.sin(e.transform.rotation) +
                  dy * Math.cos(e.transform.rotation),
              )
              .setCcdEnabled(true),
          );
          const nc = this.world.createCollider(
            RAPIER.ColliderDesc.ball(radius)
              .setDensity(this.nodeDensity(e, m.density, scale))
              .setActiveEvents(
                RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS,
              )
              .setContactForceEventThreshold(0)
              .setFriction(m.friction)
              .setRestitution(m.restitution),
            node,
          );
          this.colliderIds.set(nc.handle, e.id);
          nodes.push(node);
        }
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
          for (const [dr, dc] of [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1],
          ]) {
            const rr = row + dr!,
              cc = col + dc!;
            if (rr < 0 || rr > 2 || cc < 0 || cc > 2) continue;
            const a = nodes[row * 3 + col]!,
              bb = nodes[rr * 3 + cc]!;
            const length = Math.hypot((dc! * w) / 2, (dr! * h) / 2);
            const joint = this.world.createImpulseJoint(
              RAPIER.JointData.spring(
                length,
                60 + (1 - m.softness) * 200,
                4,
                { x: 0, y: 0 },
                { x: 0, y: 0 },
              ),
              a,
              bb,
              true,
            );
            joint.setContactsEnabled(false);
          }
      this.lattices.set(e.id, nodes);
    }
  }
  update(doc: SceneDoc) {
    this.alive();
    const old = this.doc;
    const rebuilt = new Set<string>();
    this.doc = structuredClone(doc);
    for (const e of old.entities) {
      const next = doc.entities.find((n) => n.id === e.id);
      if (!next) {
        this.remove(e.id);
        this.removed.delete(e.id);
        continue;
      }
      if (this.removed.has(e.id)) continue;
      const identity = (entity: Entity) =>
        JSON.stringify([entity.asset?.url, entity.asset?.colliderUrl, entity.asset?.status]);
      const sourceChanged = identity(e) !== identity(next);
      const outlineChanged =
        sourceChanged && this.colliderParts.has(e.id) && !this.lattices.has(e.id);
      if (sourceChanged) this.colliderParts.delete(e.id);
      const definitionChanged =
        JSON.stringify(e.body) !== JSON.stringify(next.body) ||
        JSON.stringify(old.materials[e.body.material]) !==
          JSON.stringify(doc.materials[next.body.material]);
      if (
        outlineChanged ||
        JSON.stringify(e.body) !== JSON.stringify(next.body) ||
        JSON.stringify(e.transform) !== JSON.stringify(next.transform) ||
        JSON.stringify(old.materials[e.body.material]) !==
          JSON.stringify(doc.materials[next.body.material])
      ) {
        if (definitionChanged) this.effectiveMaterials.delete(e.id);
        rebuilt.add(e.id);
        this.rebuild(e.id, next, JSON.stringify(e.transform) === JSON.stringify(next.transform));
      }
    }
    for (const e of doc.entities) {
      if (!this.entities.has(e.id) && !this.removed.has(e.id)) this.add(e);
      else {
        const live = this.entities.get(e.id);
        if (live) {
          live.asset = e.asset;
          live.behaviors = structuredClone(e.behaviors);
          live.tags = [...e.tags];
        }
      }
    }
    this.reconcileJoints();
    for (const id of Object.keys(this.variables))
      if (!doc.variables?.[id]) {
        delete this.variables[id];
        this.lastSummaries.delete(`variable:${id}`);
      }
    for (const [id, v] of Object.entries(doc.variables ?? {})) {
      const previous = old.variables?.[id];
      if (!previous || JSON.stringify(previous) !== JSON.stringify(v))
        this.setVariable(id, v.value);
      else if ('entity' in v.binds && rebuilt.has(v.binds.entity))
        this.setVariable(id, this.variables[id] ?? v.value);
    }
    const visuals = doc.visuals ?? [];
    for (const id of Object.keys(this.plots))
      if (!visuals.some((v) => v.type === 'plot' && v.id === id)) delete this.plots[id];
    for (const id of this.landingSamples.keys())
      if (!visuals.some((v) => v.type === 'histogram' && v.id === id)) {
        this.landingSamples.delete(id);
        this.landed.delete(id);
        delete this.histograms[id];
      }
    for (const v of visuals)
      if (v.type === 'histogram') {
        const prior = old.visuals?.find((p) => p.type === 'histogram' && p.id === v.id);
        if (JSON.stringify(v) !== JSON.stringify(prior)) {
          this.landingSamples.delete(v.id);
          this.landed.delete(v.id);
          delete this.histograms[v.id];
        }
      }
    if (JSON.stringify(old.visuals) !== JSON.stringify(doc.visuals)) this.watches.clear();
    if (JSON.stringify(old.environment) !== JSON.stringify(doc.environment)) {
      this.gravity =
        doc.environment.medium === 'space' ? { x: 0, y: 0 } : { ...doc.environment.gravity };
      this.wind = { ...doc.environment.wind };
      this.world.gravity = { ...this.gravity };
    }
  }

  reset() {
    this.load(this.doc);
  }
  private matches(id: string, tag: string) {
    const e = this.entities.get(id);
    return !!e && (id === tag || e.tags.includes(tag));
  }
  private targets(tag: string) {
    return [...this.entities.keys()].filter((id) => this.matches(id, tag));
  }
  private fire(event: string, data: Record<string, unknown> = {}) {
    for (const r of this.doc.rules) {
      if (data.onlyRuleId && data.onlyRuleId !== r.id) continue;
      if (r.when.event !== event || (r.once && this.fired.has(r.id))) continue;
      const w = r.when;
      let yes = false;
      switch (w.event) {
        case 'tap':
          yes = this.matches(String(data.target), w.target);
          break;
        case 'dial':
          yes = data.dial === w.dial && data.value === w.value;
          break;
        case 'timer':
          yes =
            Math.floor((this.ticks - 1) / 60 / w.everySeconds) <
            Math.floor(this.time / w.everySeconds);
          break;
        case 'collision':
          yes =
            this.pair(String(data.a), String(data.b), w.a, w.b) &&
            Number(data.impulse ?? 0) >= (w.minImpulse ?? 0);
          break;
        case 'enterMedium':
          yes = this.matches(String(data.target), w.target);
          break;
        case 'challengeComplete':
          yes = data.id === w.id;
      }
      if (yes) {
        this.fired.add(r.id);
        this.emit({ type: 'rule', ruleId: r.id, ...(r.concept ? { concept: r.concept } : {}) });
        for (const a of r.then) this.action(a, r.id, r.concept);
      }
    }
  }
  private pair(a: string, b: string, ta: string, tb: string) {
    return (
      (this.matches(a, ta) && this.matches(b, tb)) || (this.matches(a, tb) && this.matches(b, ta))
    );
  }
  private action(a: Action, ruleId?: string, concept?: Concept) {
    switch (a.action) {
      case 'say':
        this.emit({
          type: 'say',
          say: a.text,
          ...(ruleId ? { ruleId } : {}),
          ...(concept ? { concept } : {}),
        });
        break;
      case 'celebrate':
      case 'sound':
        this.emit({ type: a.action, value: a });
        break;
      case 'applyImpulse':
        for (const id of this.targets(a.target)) this.impulse(id, a.impulse);
        break;
      case 'launch':
        for (const id of this.targets(a.target)) {
          const l = this.launches.get(id) ?? { speed: 8, angle: 45 };
          const r = (l.angle * Math.PI) / 180;
          for (const node of this.nodes(id))
            node.applyImpulse(
              { x: Math.cos(r) * l.speed * node.mass(), y: -Math.sin(r) * l.speed * node.mass() },
              true,
            );
        }
        for (const id of this.targets(a.target)) {
          for (const set of this.landed.values()) set.delete(id);
          this.supported.delete(id);
        }
        this.input('launch', a.target);
        break;
      case 'setGravity':
        this.gravity.y = a.y;
        this.world.gravity = { ...this.gravity };
        break;
      case 'setTimeScale':
        this.timeScale = a.value;
        break;
      case 'scaleEntity':
        for (const id of this.targets(a.target)) this.scale(id, a.factor);
        break;
      case 'setMaterial':
        for (const id of this.targets(a.target)) {
          const e = structuredClone(this.entities.get(id)!),
            m = this.doc.materials[a.material];
          if (m) {
            e.body.material = a.material;
            this.effectiveMaterials.set(id, structuredClone(m));
            this.rebuild(id, e);
          }
        }
        this.reconcileJoints();
        break;
      case 'remove':
        for (const id of this.targets(a.target)) this.remove(id, true);
        break;
      case 'spawn': {
        const template = this.doc.entities.find((e) => e.id === a.template);
        if (!template) break;
        const at =
          typeof a.at === 'object'
            ? a.at
            : a.at === 'pointer'
              ? this.pointer
              : (this.bodies.get(this.doc.learning.heroEntityId)?.translation() ?? this.pointer);
        for (let n = 0; n < a.count && this.entities.size < 24; n++) {
          const e = structuredClone(template);
          e.id = `spawn_${++this.serial}`;
          e.body.isStatic = false;
          e.transform = { x: at.x + (this.random() - 0.5) * 0.2, y: at.y, rotation: 0 };
          this.add(e);
          this.templates.set(e.id, template.id);
        }
        break;
      }
    }
  }
  setCollider(target: string, value: unknown): boolean {
    this.alive();
    const parts = parseCollider(value),
      e = this.entities.get(target);
    if (!parts || !e || e.body.shape !== 'auto') return false;
    if (JSON.stringify(this.colliderParts.get(target)) === JSON.stringify(parts)) return true;
    this.colliderParts.set(target, parts);
    if (this.lattices.has(target)) return true;
    this.rebuild(target, e);
    this.reconcileJoints();
    return true;
  }
  private scale(id: string, factor: number) {
    const e = this.entities.get(id),
      b = this.bodies.get(id);
    if (!e || !b) return;
    const s = Math.max(0.5, Math.min(2, factor));
    this.scales.set(id, s);
    this.rebuild(id, e);
    this.reconcileJoints();
  }

  tap(target: string, at?: Vec2) {
    this.alive();
    if (at) this.pointer = { ...at };
    this.input('tap', target);
    this.fire('tap', { target });
  }
  drag(target: string, at: Vec2) {
    this.alive();
    this.pointer = { ...at };
    const body = this.bodies.get(target);
    if (body?.isDynamic()) {
      this.holds.set(target, { ...at });
      let anchor = this.anchors.get(target);
      if (!anchor) {
        anchor = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(at.x, at.y),
        );
        this.anchors.set(target, anchor);
        for (const node of this.nodes(target)) {
          const mass = node.mass();
          const offset = {
            x: node.translation().x - body.translation().x,
            y: node.translation().y - body.translation().y,
          };
          const joint = this.world.createImpulseJoint(
            RAPIER.JointData.spring(0, 400 * mass, 40 * mass, { x: 0, y: 0 }, offset),
            node,
            anchor,
            true,
          );
          joint.setContactsEnabled(false);
        }
      }
      anchor.setNextKinematicTranslation(at);
    }
    this.input('drag', target, at);
  }
  cancelDrag(target: string) {
    this.alive();
    this.holds.delete(target);
    const anchor = this.anchors.get(target);
    if (anchor) {
      this.world.removeRigidBody(anchor);
      this.anchors.delete(target);
    }
  }
  flick(target: string, velocity: Vec2) {
    this.alive();
    this.cancelDrag(target);
    for (const set of this.landed.values()) set.delete(target);
    this.supported.delete(target);
    const length = Math.hypot(velocity.x, velocity.y),
      scale = length > 20 ? 20 / length : 1;
    for (const node of this.nodes(target))
      node.setLinvel({ x: velocity.x * scale, y: velocity.y * scale }, true);
    this.input('flick', target, velocity);
  }
  setDial(dial: Dial, value: string) {
    this.alive();
    if (!this.doc.learning.dials.includes(dial)) return;
    if (dial === 'gravity') {
      const p: Record<string, number> = { earth: 9.81, moon: 1.62, jupiter: 24.8, none: 0 };
      if (p[value] === undefined) return;
      this.gravity.y = p[value]!;
      this.world.gravity = { ...this.gravity };
    }
    if (dial === 'wind') {
      const p: Record<string, number> = { none: 0, breeze: 2, storm: 8 };
      if (p[value] === undefined) return;
      this.wind.x = p[value]!;
    }
    if (dial === 'heroMaterial')
      this.action({
        action: 'setMaterial',
        target: this.doc.learning.heroEntityId,
        material: value,
      });
    this.input('dial', dial, value);
    this.fire('dial', { dial, value });
  }
  setVariable(id: string, value: number) {
    this.alive();
    const v = this.doc.variables?.[id];
    if (!v || !Number.isFinite(value)) return;
    const n = Math.max(
      v.min,
      Math.min(v.max, v.min + Math.round((value - v.min) / v.step) * v.step),
    );
    this.variables[id] = n;
    const bind = v.binds;
    switch (bind.kind) {
      case 'gravity':
        this.gravity.y = n;
        this.world.gravity = { ...this.gravity };
        break;
      case 'wind':
        this.wind.x = n;
        break;
      case 'timeScale':
        this.timeScale = Math.max(0.1, Math.min(2, n));
        break;
      case 'scale':
        this.scale(bind.entity, n);
        break;
      case 'launch': {
        const l = this.launches.get(bind.entity) ?? { speed: 8, angle: 45 };
        l[bind.prop] = n;
        this.launches.set(bind.entity, l);
        break;
      }
      case 'material': {
        const b = this.bodies.get(bind.entity);
        if (b) {
          const material = this.effectiveMaterials.get(bind.entity)!;
          material[bind.prop] = n;
          for (const node of this.lattices.get(bind.entity) ?? [b])
            for (let i = 0; i < node.numColliders(); i++) {
              const c = node.collider(i);
              if (bind.prop === 'density')
                c.setDensity(
                  this.lattices.has(bind.entity)
                    ? this.nodeDensity(
                        this.entities.get(bind.entity)!,
                        Math.max(0.05, n),
                        this.scales.get(bind.entity) ?? 1,
                      )
                    : Math.max(0.05, n),
                );
              if (bind.prop === 'friction') c.setFriction(Math.max(0, Math.min(1, n)));
              if (bind.prop === 'restitution') c.setRestitution(Math.max(0, Math.min(1, n)));
            }
        }
        break;
      }
    }
    this.input('variable', id, n);
  }
  castSpell(spell: Spell, target?: string) {
    this.alive();
    if (spell === 'restore') {
      if (this.spellBaseline) {
        this.gravity = { ...this.spellBaseline.gravity };
        this.timeScale = this.spellBaseline.timeScale;
        for (const id of this.entities.keys())
          if ((this.scales.get(id) ?? 1) !== (this.spellBaseline.scales.get(id) ?? 1))
            this.scale(id, this.spellBaseline.scales.get(id) ?? 1);
      }
      this.floatOverride = false;
      this.spellBaseline = undefined;
    } else {
      this.spellBaseline ??= {
        gravity: { ...this.gravity },
        timeScale: this.timeScale,
        scales: new Map(this.scales),
      };
      if (spell === 'reverseGravity') this.gravity.y = -this.gravity.y;
      if (spell === 'slowMotion' || spell === 'slowTime') this.timeScale = 0.25;
      if (spell === 'grow' || spell === 'shrink')
        for (const id of this.targets(target ?? this.doc.learning.heroEntityId))
          this.scale(id, spell === 'grow' ? 2 : 0.5);
      if (spell === 'float' || spell === 'floatAll') this.floatOverride = true;
    }
    this.world.gravity = { ...this.gravity };
    this.input('spell', spell);
    this.emit({ type: 'celebrate', value: 'sparkle' });
  }
  step(frames = 1) {
    this.alive();
    for (let frame = 0; frame < Math.min(3600, Math.max(0, Math.floor(frames))); frame++)
      this.advance(1 / 60);
  }
  advance(seconds: number) {
    this.alive();
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.pendingTicks += Math.min(60, seconds) * 60 * this.timeScale;
    while (this.pendingTicks >= 1 - 1e-9) {
      this.pendingTicks = Math.max(0, this.pendingTicks - 1);
      this.previousPoses = this.poses();
      this.world.timestep = 1 / 60;
      this.ticks++;
      this.time = this.ticks / 60;
      for (const [id, b] of this.bodies) {
        if (b.isFixed()) continue;
        for (const node of this.lattices.get(id) ?? [b]) node.resetForces(false);
        const e = this.entities.get(id)!;
        const p = b.translation();
        let water = this.doc.environment.medium === 'water';
        for (const w of this.entities.values())
          if (
            w.kind === 'water' &&
            Math.abs(p.x - w.transform.x) < w.body.size.width / 2 &&
            Math.abs(p.y - w.transform.y) < w.body.size.height / 2
          )
            water = true;
        if (water && !this.submerged.has(id)) {
          this.submerged.add(id);
          this.fire('enterMedium', { target: id });
        }
        if (!water) this.submerged.delete(id);
        const m = this.effectiveMaterials.get(id)!;
        const v = b.linvel();
        const drag = water ? 2 : this.doc.environment.medium === 'space' ? 0 : 0.02;
        for (const node of this.lattices.get(id) ?? [b]) {
          const velocity = node.linvel();
          node.addForce(
            {
              x: node.mass() * (this.wind.x - velocity.x * drag),
              y:
                node.mass() *
                (this.wind.y -
                  velocity.y * drag -
                  (this.floatOverride
                    ? this.gravity.y * 1.3
                    : water
                      ? this.gravity.y / Math.max(0.05, m.density)
                      : 0)),
            },
            true,
          );
        }
        const hold = this.holds.get(id);
        if (hold) {
          this.anchors.get(id)?.setNextKinematicTranslation(hold);
          for (const node of this.nodes(id))
            node.addForce(
              { x: -node.mass() * this.gravity.x, y: -node.mass() * this.gravity.y },
              true,
            );
        }
        for (const node of this.nodes(id))
          for (const behavior of e.behaviors) {
            const b = node;
            if (behavior.type === 'wander')
              b.addForce(
                { x: Math.sin(this.time + id.length) * behavior.speed * b.mass(), y: 0 },
                true,
              );
            if (behavior.type === 'float')
              b.addForce(
                {
                  x: 0,
                  y:
                    Math.sin((this.time * 2 * Math.PI) / behavior.period) *
                    behavior.amplitude *
                    b.mass(),
                },
                true,
              );
            if (behavior.type === 'bounceIdle' && this.supported.has(id) && Math.abs(v.y) < 0.05)
              b.applyImpulse({ x: 0, y: -b.mass() * 1.5 }, true);
          }
      }
      this.world.step(this.queue);
      const forces = new Map<string, number>();
      const pairs = new Map<string, { a: string; b: string; started: boolean }>();
      this.queue.drainContactForceEvents((event) => {
        const a = this.colliderIds.get(event.collider1()),
          b = this.colliderIds.get(event.collider2());
        if (!a || !b || a === b) return;
        const key = [a, b].sort().join(':');
        forces.set(key, (forces.get(key) ?? 0) + event.totalForceMagnitude() * this.world.timestep);
        pairs.set(key, { a, b, started: false });
      });
      this.queue.drainCollisionEvents((ca, cb, started) => {
        const a = this.colliderIds.get(ca),
          b = this.colliderIds.get(cb);
        if (!a || !b || a === b) return;
        const key = [a, b].sort().join(':');
        if (started) pairs.set(key, { a, b, started: true });
      });
      // A landing may spread over several nodes/ticks. Rules run once per contact episode
      // when their threshold is crossed, rather than only on the first narrow-phase contact.
      const active = new Set<string>();
      for (const id of this.bodies.keys())
        for (const node of this.nodes(id))
          for (let i = 0; i < node.numColliders(); i++)
            this.world.contactPairsWith(node.collider(i), (other) => {
              const otherId = this.colliderIds.get(other.handle);
              if (otherId && id !== otherId) active.add([id, otherId].sort().join(':'));
            });
      for (const key of this.collisionRuleContacts.keys())
        if (!active.has(key)) this.collisionRuleContacts.delete(key);
      for (const [key, { a, b, started }] of pairs) {
        const delivered = this.collisionRuleContacts.get(key) ?? new Set<string>();
        this.collisionRuleContacts.set(key, delivered);
        const impulse = forces.get(key) ?? 0;
        for (const rule of this.doc.rules) {
          const when = rule.when;
          if (
            when.event === 'collision' &&
            !delivered.has(rule.id) &&
            this.pair(a, b, when.a, when.b) &&
            impulse >= (when.minImpulse ?? 0)
          ) {
            delivered.add(rule.id);
            this.fire('collision', { a, b, impulse, onlyRuleId: rule.id });
          }
        }
        if (started) {
          (this.doc.visuals ?? []).forEach((visual, i) => {
            const watch = this.watches.get(i);
            if (
              visual.type === 'stopwatch' &&
              watch &&
              watch.stop === undefined &&
              this.pair(a, b, visual.stopOn.a, visual.stopOn.b)
            )
              watch.stop = this.time;
          });
          for (const c of this.doc.challenges ?? [])
            if (c.check.event === 'collision' && this.pair(a, b, c.check.a, c.check.b))
              this.complete(c.id);
        }
      }
      this.supported.clear();
      for (const [id, b] of this.bodies) {
        if (b.isFixed()) continue;
        for (const node of this.lattices.get(id) ?? [b])
          for (let i = 0; i < node.numColliders(); i++)
            this.world.contactPairsWith(node.collider(i), (other) => {
              if (other.isSensor()) return;
              const parent = other.parent();
              if (!parent || parent.isFixed()) {
                const p = other.translation();
                if (p.y >= node.translation().y) this.supported.add(id);
              }
            });
      }
      this.fire('timer');
      if (this.ticks % 6 === 0) this.sample();
    }
  }
  private complete(id: string) {
    if (this.completed.has(id)) return;
    this.completed.add(id);
    const c = this.doc.challenges?.find((c) => c.id === id);
    this.emit({ type: 'challengeComplete', target: id, ...(c ? { concept: c.concept } : {}) });
    for (const a of c?.reward ?? []) this.action(a, undefined, c?.concept);
    this.fire('challengeComplete', { id });
  }
  private sample() {
    const entities = this.poses();
    this.history.push({ time: this.time, entities });
    if (this.history.length > 600) this.history.shift();
    for (const v of this.doc.visuals ?? []) {
      if (v.type === 'plot') {
        const p = entities.find((e) => e.id === v.y.entity);
        if (!p) continue;
        const value =
          v.y.prop === 'speed'
            ? Math.hypot(p.vx, p.vy)
            : v.y.prop === 'height'
              ? 9 - p.y
              : p[v.y.prop];
        const list = (this.plots[v.id] ??= []);
        list.push({ time: this.time, value });
        while (list.length && list[0]!.time < this.time - v.maxSeconds) list.shift();
      }
      if (v.type === 'histogram') {
        const observations = this.landingSamples.get(v.id) ?? [];
        this.landingSamples.set(v.id, observations);
        const seen = this.landed.get(v.id) ?? new Set<string>();
        this.landed.set(v.id, seen);
        for (const p of entities)
          if (
            this.matches(p.id, v.source.tag) &&
            !seen.has(p.id) &&
            this.supported.has(p.id) &&
            Math.hypot(p.vx, p.vy) < 0.15
          ) {
            seen.add(p.id);
            observations.push(p.x);
            if (observations.length > 500) observations.shift();
          }
        const bins = Array<number>(v.bins).fill(0);
        for (const x of observations)
          bins[Math.max(0, Math.min(v.bins - 1, Math.floor((x / 16) * v.bins)))]!++;
        this.histograms[v.id] = bins;
        for (const c of this.doc.challenges ?? [])
          if (
            c.check.event === 'histogramFilled' &&
            c.check.id === v.id &&
            bins.reduce((a, b) => a + b, 0) >= c.check.count
          )
            this.complete(c.id);
      }
    }
  }
  private poses(): Pose[] {
    return [...this.bodies].map(([id, b]) => {
      const p = b.translation(),
        v = b.linvel(),
        e = this.entities.get(id)!,
        s = this.scales.get(id) ?? 1;
      return {
        id,
        templateId: this.templates.get(id) ?? id,
        x: p.x,
        y: p.y,
        rotation: b.rotation(),
        vx: v.x,
        vy: v.y,
        width: e.body.size.width * s,
        height: e.body.size.height * s,
        ...(this.lattices.has(id)
          ? { nodes: this.lattices.get(id)!.map((n) => ({ ...n.translation() })) }
          : {}),
      };
    });
  }
  frame(): SimulationFrame {
    this.alive();
    return {
      time: this.time,
      previousEntities: this.previousPoses,
      interpolation: this.pendingTicks,
      timeScale: this.timeScale,
      gravity: { ...this.gravity },
      entities: this.poses(),
      variables: this.variables,
      plots: this.plots,
      histograms: this.histograms,
      challenges: [...this.completed],
      stopwatches: Object.fromEntries(
        [...this.watches].map(([i, w]) => [i, (w.stop ?? this.time) - w.start]),
      ),
    };
  }
  snapshot(): SimulationSnapshot {
    return structuredClone({ ...this.frame(), history: this.history, inputs: this.inputs });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.free();
    this.queue.free();
    this.listeners.clear();
    this.bodies.clear();
    this.templates.clear();
    this.collisionRuleContacts.clear();
    this.entities.clear();
    this.colliderIds.clear();
    this.lattices.clear();
    this.effectiveMaterials.clear();
    this.scales.clear();
    this.launches.clear();
    this.submerged.clear();
    this.holds.clear();
    this.documentJoints = [];
    this.colliderParts.clear();
    this.removed.clear();
    this.landingSamples.clear();
    this.landed.clear();
    this.supported.clear();
    this.lastSummaries.clear();
    this.fired.clear();
    this.completed.clear();
    this.watches.clear();
    this.variables = {};
    this.plots = {};
    this.histograms = {};
    this.history = [];
    this.inputs = [];
    this.previousPoses = [];
    this.pendingTicks = 0;
    this.spellBaseline = undefined;
  }
}
