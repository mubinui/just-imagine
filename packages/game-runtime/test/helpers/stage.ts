import type { SceneDoc, Dial } from '@just-imagine/scene-schema';
import type { Command, GameState, EntityState } from '../../src/protocol';
import type { Stage, StageCollision, StageDial } from '../../src/drive';

interface FakeEntity {
  id: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isStatic: boolean;
  material: string;
  templateId?: string;
  /** Vertical velocity before contact resolution, for collision impulses. */
  impactVy: number;
  supported: boolean;
}

const STAGE_WIDTH = 16;
const STAGE_HEIGHT = 9;

/**
 * A tiny kinematic stage for driving example games without the engine: gravity,
 * wind, axis-aligned stacking on static or resting bodies, friction when
 * supported, and contact-start collision events.
 */
export class FakeStage implements Stage {
  readonly entities = new Map<string, FakeEntity>();
  gravity = { x: 0, y: 9.81 };
  wind = { x: 0, y: 0 };
  time = 0;
  readonly applied: Command[] = [];
  private active = new Set<string>();
  private started: StageCollision[] = [];
  private heroId: string | undefined;
  private dialOptions: StageDial[] = [];
  private materials: string[] = [];

  static fromScene(doc: SceneDoc): FakeStage {
    const stage = new FakeStage();
    stage.gravity = { ...doc.environment.gravity };
    stage.wind = { ...doc.environment.wind };
    stage.heroId = doc.learning.heroEntityId;
    stage.materials = Object.keys(doc.materials);
    for (const e of doc.entities)
      stage.entities.set(e.id, {
        id: e.id,
        tags: [...e.tags],
        x: e.transform.x,
        y: e.transform.y,
        vx: 0,
        vy: 0,
        width: e.body.size.width,
        height: e.body.size.height,
        isStatic: e.body.isStatic,
        material: e.body.material,
        impactVy: 0,
        supported: false,
      });
    const hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId);
    for (const dial of doc.learning.dials) {
      if (dial === 'gravity') stage.dialOptions.push({ dial, value: 'moon' });
      if (dial === 'wind') stage.dialOptions.push({ dial, value: 'breeze' });
      if (dial === 'heroMaterial') {
        const other = stage.materials.find((m) => m !== hero?.body.material);
        if (other) stage.dialOptions.push({ dial, value: other });
      }
    }
    return stage;
  }

  private dynamic(): FakeEntity[] {
    return [...this.entities.values()].filter((e) => !e.isStatic);
  }

  private overlaps(a: FakeEntity, b: FakeEntity, eps = 0.02): boolean {
    return (
      Math.abs(a.x - b.x) <= (a.width + b.width) / 2 + eps &&
      Math.abs(a.y - b.y) <= (a.height + b.height) / 2 + eps
    );
  }

  step(dt: number): void {
    this.time += dt;
    const moving = this.dynamic();
    for (const e of moving) {
      e.vx += (this.gravity.x + this.wind.x) * dt;
      e.vy += (this.gravity.y + this.wind.y) * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.impactVy = e.vy;
      e.supported = false;
    }
    // Resolve downward contacts bottom-up so stacks settle on each other.
    moving.sort((a, b) => b.y - a.y);
    for (const e of moving) {
      const bottom = e.y + e.height / 2;
      for (const o of this.entities.values()) {
        if (o === e || (!o.isStatic && !o.supported)) continue;
        const top = o.y - o.height / 2;
        const prevBottom = bottom - e.vy * dt;
        if (
          Math.abs(e.x - o.x) < (e.width + o.width) / 2 &&
          bottom > top &&
          prevBottom <= top + 0.05 + Math.max(0, e.vy * dt) &&
          e.vy >= 0
        ) {
          e.y = top - e.height / 2;
          e.vy = 0;
          e.supported = true;
        }
      }
      if (e.y + e.height / 2 > STAGE_HEIGHT) {
        e.y = STAGE_HEIGHT - e.height / 2;
        e.vy = 0;
        e.supported = true;
      }
      if (e.y - e.height / 2 < 0) {
        e.y = e.height / 2;
        e.vy = Math.max(0, e.vy);
      }
      if (e.x - e.width / 2 < 0) {
        e.x = e.width / 2;
        e.vx = 0;
      }
      if (e.x + e.width / 2 > STAGE_WIDTH) {
        e.x = STAGE_WIDTH - e.width / 2;
        e.vx = 0;
      }
      if (e.supported) e.vx *= 0.9;
    }
    const current = new Set<string>();
    const all = [...this.entities.values()];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!,
          b = all[j]!;
        if (a.isStatic && b.isStatic) continue;
        if (!this.overlaps(a, b)) continue;
        const key = `${a.id}:${b.id}`;
        current.add(key);
        if (!this.active.has(key))
          this.started.push({
            a: a.id,
            b: b.id,
            impulse: Math.hypot(a.vx - b.vx, a.impactVy - b.impactVy) + 0.1,
          });
      }
    this.active = current;
  }

  state(): GameState {
    const entities: EntityState[] = [...this.entities.values()].map((e) => ({
      id: e.id,
      tags: e.tags,
      x: e.x,
      y: e.y,
      rotation: 0,
      vx: e.vx,
      vy: e.vy,
      width: e.width,
      height: e.height,
      ...(e.templateId ? { templateId: e.templateId } : {}),
    }));
    return { time: this.time, entities };
  }

  collisions(): StageCollision[] {
    return this.started.splice(0);
  }

  tappable(): string[] {
    return this.dynamic().map((e) => e.id);
  }

  dials(): StageDial[] {
    return this.dialOptions;
  }

  hero(): string | undefined {
    return this.heroId;
  }

  position(id: string): { x: number; y: number } | undefined {
    const e = this.entities.get(id);
    return e ? { x: e.x, y: e.y } : undefined;
  }

  tap(): void {
    // Taps have no physical effect on the fake stage; the script reacts to the event.
  }

  flick(id: string, velocity: { x: number; y: number }): void {
    const e = this.entities.get(id);
    if (e && !e.isStatic) {
      e.vx = velocity.x;
      e.vy = velocity.y;
    }
  }

  dial(dial: Dial, value: string): void {
    if (dial === 'gravity') {
      const presets: Record<string, number> = { earth: 9.81, moon: 1.62, jupiter: 24.8, none: 0 };
      if (presets[value] !== undefined) this.gravity.y = presets[value]!;
    }
    if (dial === 'wind') {
      const presets: Record<string, number> = { none: 0, breeze: 2, storm: 8 };
      if (presets[value] !== undefined) this.wind.x = presets[value]!;
    }
    if (dial === 'heroMaterial' && this.heroId) {
      const hero = this.entities.get(this.heroId);
      if (hero) hero.material = value;
    }
  }

  private targets(target: string): FakeEntity[] {
    return [...this.entities.values()].filter((e) => e.id === target || e.tags.includes(target));
  }

  apply(command: Command): void {
    this.applied.push(command);
    switch (command.type) {
      case 'spawn': {
        const template = this.entities.get(command.template);
        this.entities.set(command.id, {
          id: command.id,
          tags: [...new Set([...(template?.tags ?? []), ...command.tags])],
          x: command.x,
          y: command.y,
          vx: 0,
          vy: 0,
          width: template?.width ?? 0.5,
          height: template?.height ?? 0.5,
          isStatic: false,
          material: command.material ?? template?.material ?? this.materials[0] ?? 'wood',
          templateId: command.template,
          impactVy: 0,
          supported: false,
        });
        break;
      }
      case 'remove':
        for (const e of this.targets(command.target)) this.entities.delete(e.id);
        break;
      case 'impulse':
        for (const e of this.targets(command.target))
          if (!e.isStatic) {
            e.vx += command.x;
            e.vy += command.y;
            e.supported = false;
          }
        break;
      case 'setGravity':
        this.gravity = { x: command.x, y: command.y };
        break;
      case 'setWind':
        this.wind = { x: command.x, y: command.y };
        break;
      case 'setMaterial':
        for (const e of this.targets(command.target)) e.material = command.material;
        break;
      default:
        break;
    }
  }
}
