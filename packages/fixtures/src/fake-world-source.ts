import { z } from 'zod';
import {
  DocumentIdSchema,
  WorldDocSchema,
  type WorldSource,
  type WorldWithId,
} from '@just-imagine/protocol';
import { fixtureWorldDoc, type FixtureWorldKey } from './worlds';

export interface FakeWorldStep {
  afterMs: number;
  world: WorldWithId;
}

const ScriptSchema = z.array(
  z.object({
    afterMs: z.number().int().min(0).max(2_147_483_647),
    world: WorldDocSchema.extend({ id: DocumentIdSchema }),
  }),
);

export interface FakeWorldTimers {
  setTimeout(callback: () => void, afterMs: number): ReturnType<typeof setTimeout>;
  clearTimeout(handle: ReturnType<typeof setTimeout>): void;
}

export function progressiveScript(key: FixtureWorldKey): FakeWorldStep[] {
  const building = fixtureWorldDoc(key, { status: 'building' });
  const heroId = building.doc.learning.heroEntityId;
  building.assets = Object.fromEntries(
    building.doc.entities.map((e) => [e.id, { status: 'generating' as const }]),
  );

  const heroReady = structuredClone(building);
  const hero = heroReady.doc.entities.find((e) => e.id === heroId)!;
  hero.asset = {
    url: `https://cdn.invalid/fixtures/${key}/${heroId}.webp`,
    width: 1024,
    height: 1024,
    status: 'ready',
  };
  heroReady.assets[heroId] = { status: 'ready', url: hero.asset.url };
  heroReady.updatedAt += 400;

  const ready = structuredClone(heroReady);
  ready.status = 'ready';
  ready.updatedAt += 400;
  for (const asset of Object.values(ready.assets)) {
    if (asset.status === 'generating') asset.status = 'placeholder';
  }

  return [
    { afterMs: 0, world: building },
    { afterMs: 400, world: heroReady },
    { afterMs: 800, world: ready },
  ];
}

export class FakeWorldSource implements WorldSource {
  private readonly script: FakeWorldStep[];
  private readonly timers: FakeWorldTimers;

  constructor(script: FakeWorldStep[], opts: { timers?: FakeWorldTimers } = {}) {
    this.script = ScriptSchema.parse(script);
    this.timers = opts.timers ?? {
      setTimeout: (callback, afterMs) => globalThis.setTimeout(callback, afterMs),
      clearTimeout: (handle) => globalThis.clearTimeout(handle),
    };
  }

  subscribe(
    worldId: string,
    onUpdate: (world: WorldWithId) => void,
    _onError?: (error: Error) => void,
  ): () => void {
    let active = true;
    const handles = this.script
      .filter((step) => step.world.id === worldId)
      .map((step) =>
        this.timers.setTimeout(() => {
          if (active) onUpdate(structuredClone(step.world));
        }, step.afterMs),
      );
    return () => {
      active = false;
      handles.forEach((handle) => this.timers.clearTimeout(handle));
    };
  }
}
