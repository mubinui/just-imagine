import { createSimulation, type Pose, type Simulation } from '@just-imagine/engine';
import type { SceneDoc, Entity, Dial } from '@just-imagine/scene-schema';
import {
  driveScript,
  type DriveStats,
  type Stage,
  type StageCollision,
  type StageDial,
} from './drive';
import type { Budgets, BudgetBreach } from './budgets';
import type { Command, EntityState } from './protocol';
import type { GameError } from './host';
import type { ScriptIssue } from './static-check';
import { nodeWorkerFactory } from './node';

export type SmokeLanguage = 'en' | 'bn';

export interface SmokeOptions {
  /** Simulated seconds to run. The builder uses 10. */
  seconds: number;
  requireGoal?: boolean;
  language: SmokeLanguage;
  /** Returns true when a child-facing string is safe in the given language. */
  moderate?: (text: string, language: SmokeLanguage) => Promise<boolean>;
  budgets?: Partial<Budgets>;
}

export type SmokeFailure =
  | { reason: 'static'; detail: { errors: ScriptIssue[] } }
  | { reason: 'runtime'; detail: GameError }
  | { reason: 'budget'; detail: BudgetBreach }
  | { reason: 'no-goal'; detail: { message: string } }
  | { reason: 'moderation'; detail: { rejected: string[] } };

export type SmokeResult =
  { ok: true; stats: DriveStats } | ({ ok: false; stats: DriveStats } & SmokeFailure);

const GRAVITY_PRESETS: Record<string, number> = { earth: 9.81, moon: 1.62, jupiter: 24.8, none: 0 };
const LIMIT = 30;
const clamp = (n: number) => Math.max(-LIMIT, Math.min(LIMIT, n));
/** Extra slack, in meters, when deciding two bodies touch. */
const CONTACT_SLACK = 0.03;

/** Axis-aligned half extents of a possibly rotated box. */
function halfExtents(p: Pose): { hx: number; hy: number } {
  const c = Math.abs(Math.cos(p.rotation)),
    s = Math.abs(Math.sin(p.rotation));
  return {
    hx: (c * p.width + s * p.height) / 2,
    hy: (s * p.width + c * p.height) / 2,
  };
}

/**
 * Wraps the real headless engine as a smoke-run stage. Commands go through the
 * engine's public API only: document updates for spawn, remove, gravity, wind
 * and materials (so the material table still governs), `flick` for impulses.
 */
export async function createEngineStage(source: SceneDoc): Promise<Stage> {
  const doc: SceneDoc = structuredClone(source);
  const sim: Simulation = await createSimulation(doc);
  const templates = new Map<string, string>();
  let active = new Set<string>();
  let started: StageCollision[] = [];
  let poses: Pose[] = sim.frame().entities;
  const entityOf = (id: string) => doc.entities.find((e) => e.id === id);

  const refresh = () => {
    poses = sim.frame().entities;
  };
  const matching = (target: string) =>
    doc.entities.filter(
      (e) => e.id === target || e.tags.includes(target) || templates.get(e.id) === target,
    );
  const commit = () => {
    sim.update(doc);
    refresh();
  };

  const detectContacts = () => {
    const current = new Set<string>();
    for (let i = 0; i < poses.length; i++)
      for (let j = i + 1; j < poses.length; j++) {
        const a = poses[i]!,
          b = poses[j]!;
        if (entityOf(a.id)?.body.isStatic && entityOf(b.id)?.body.isStatic) continue;
        const ea = halfExtents(a),
          eb = halfExtents(b);
        if (
          Math.abs(a.x - b.x) > ea.hx + eb.hx + CONTACT_SLACK ||
          Math.abs(a.y - b.y) > ea.hy + eb.hy + CONTACT_SLACK
        )
          continue;
        const key = `${a.id}:${b.id}`;
        current.add(key);
        if (!active.has(key))
          started.push({ a: a.id, b: b.id, impulse: Math.hypot(a.vx - b.vx, a.vy - b.vy) });
      }
    active = current;
  };

  const hero = doc.learning.heroEntityId;
  const dials: StageDial[] = [];
  for (const dial of doc.learning.dials) {
    if (dial === 'gravity') dials.push({ dial, value: 'moon' });
    if (dial === 'wind') dials.push({ dial, value: 'breeze' });
    if (dial === 'heroMaterial') {
      const current = entityOf(hero)?.body.material;
      const other = Object.keys(doc.materials).find((m) => m !== current);
      if (other) dials.push({ dial, value: other });
    }
  }

  const spawnEntity = (command: Extract<Command, { type: 'spawn' }>): Entity => {
    const template = entityOf(command.template);
    const material =
      command.material && doc.materials[command.material] ? command.material : undefined;
    if (template) {
      const clone = structuredClone(template);
      clone.id = command.id;
      clone.transform = { x: command.x, y: command.y, rotation: template.transform.rotation };
      clone.tags = [...new Set([...template.tags, ...command.tags])].slice(0, 8);
      clone.body.isStatic = false;
      if (material) clone.body.material = material;
      return clone;
    }
    return {
      id: command.id,
      kind: 'sprite',
      name: 'library prop',
      description: `placeholder for ${command.template}`,
      body: {
        shape: 'circle',
        material: material ?? Object.keys(doc.materials)[0]!,
        isStatic: false,
        size: { width: 0.6, height: 0.6 },
      },
      transform: { x: command.x, y: command.y, rotation: 0 },
      tags: command.tags,
      behaviors: [],
      pretend: false,
    };
  };

  return {
    step(dt) {
      sim.step(Math.max(1, Math.round(dt * 60)));
      refresh();
      detectContacts();
    },
    state() {
      const entities: EntityState[] = poses.map((p) => {
        const templateId = templates.get(p.id);
        return {
          id: p.id,
          tags: entityOf(p.id)?.tags ?? [],
          x: p.x,
          y: p.y,
          rotation: p.rotation,
          vx: p.vx,
          vy: p.vy,
          width: p.width,
          height: p.height,
          ...(templateId ? { templateId } : {}),
        };
      });
      return { time: sim.frame().time, entities };
    },
    collisions() {
      const out = started;
      started = [];
      return out;
    },
    tappable() {
      return poses
        .filter((p) => {
          const e = entityOf(p.id);
          return !!e && !e.body.isStatic && e.kind === 'sprite';
        })
        .map((p) => p.id);
    },
    dials: () => dials,
    hero: () => hero,
    position(id) {
      const p = poses.find((pose) => pose.id === id);
      return p ? { x: p.x, y: p.y } : undefined;
    },
    tap(id, at) {
      sim.tap(id, at);
    },
    flick(id, velocity) {
      sim.flick(id, velocity);
      refresh();
    },
    dial(dial: Dial, value: string) {
      sim.setDial(dial, value);
      if (dial === 'gravity' && GRAVITY_PRESETS[value] !== undefined)
        doc.environment.gravity = { x: doc.environment.gravity.x, y: GRAVITY_PRESETS[value]! };
    },
    apply(command) {
      switch (command.type) {
        case 'move':
          sim.move(command.target, { x: command.x, y: command.y });
          refresh();
          return;
        case 'spawn':
          doc.entities.push(spawnEntity(command));
          templates.set(command.id, command.template);
          commit();
          return;
        case 'remove': {
          const gone = new Set(matching(command.target).map((e) => e.id));
          if (gone.size === 0) return;
          doc.entities = doc.entities.filter((e) => !gone.has(e.id));
          commit();
          return;
        }
        case 'impulse':
          for (const e of matching(command.target)) {
            if (e.body.isStatic) continue;
            const p = poses.find((pose) => pose.id === e.id);
            if (p) sim.flick(e.id, { x: p.vx + command.x, y: p.vy + command.y });
          }
          refresh();
          return;
        case 'setGravity':
          doc.environment.gravity = { x: clamp(command.x), y: clamp(command.y) };
          commit();
          return;
        case 'setWind':
          doc.environment.wind = { x: clamp(command.x), y: clamp(command.y) };
          commit();
          return;
        case 'setMaterial': {
          if (!doc.materials[command.material]) return;
          const targets = matching(command.target);
          for (const e of targets) e.body.material = command.material;
          if (targets.length > 0) commit();
          return;
        }
        default:
          return;
      }
    },
    dispose() {
      sim.dispose();
    },
  };
}

/**
 * The builder's gate for a generated game script: static check, then ten
 * simulated seconds in a Node worker against the real headless engine with
 * scripted inputs, then moderation of every child-facing string.
 */
export async function smokeRun(
  doc: SceneDoc,
  source: string,
  options: SmokeOptions,
): Promise<SmokeResult> {
  const stage = await createEngineStage(doc);
  const result = await driveScript(source, stage, {
    seconds: options.seconds,
    requireGoal: options.requireGoal,
    seed: doc.environment.seed,
    worker: nodeWorkerFactory,
    ...(options.budgets ? { budgets: options.budgets } : {}),
  });
  if (!result.ok) return result;
  if (options.moderate) {
    const rejected: string[] = [];
    for (const text of result.stats.strings)
      if (!(await options.moderate(text, options.language))) rejected.push(text);
    if (rejected.length > 0)
      return { ok: false, reason: 'moderation', detail: { rejected }, stats: result.stats };
  }
  return { ok: true, stats: result.stats };
}
