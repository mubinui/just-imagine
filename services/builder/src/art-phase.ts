import { PLAN_LIMITS, type PlanTier, type WorldDoc } from '@just-imagine/protocol';
import type { AssetRef, Locomotion, SceneDoc } from '@just-imagine/scene-schema';
import { applyPaintedFloor } from './presentation';

/** One picture the world needs: the backdrop, the mid layer or a sprite. */
export interface ArtRequest {
  id: string;
  description: string;
  kind: string;
  hero: boolean;
  locomotion?: Locomotion;
}

/** A finished, safety-checked picture, as the asset cache stores it. */
export interface ArtAsset {
  url: string;
  width: number;
  height: number;
  animation?: AssetRef['animation'];
  colliderUrl?: string | null;
}

export type ArtOutcome =
  { status: 'ready'; asset: ArtAsset } | { status: 'failed' } | { status: 'generating' };

/**
 * Generate the requested art `concurrency` at a time. A request that has not
 * started by `deadline`, or while `stop` reports the kill switch, is marked
 * failed without a call; calls already running are allowed to finish. Every
 * change is reported through `onUpdate` and kept in `outcomes`; `done` never
 * rejects.
 */
export function startArt(
  requests: ArtRequest[],
  generate: (request: ArtRequest) => Promise<ArtAsset>,
  options: {
    deadline: number;
    concurrency?: number;
    now?: () => number;
    onUpdate?: (id: string, outcome: ArtOutcome) => void;
    stop?: () => Promise<boolean>;
  },
): { outcomes: Map<string, ArtOutcome>; done: Promise<void> } {
  const now = options.now ?? Date.now;
  const outcomes = new Map<string, ArtOutcome>();
  const report = (id: string, outcome: ArtOutcome) => {
    outcomes.set(id, outcome);
    options.onUpdate?.(id, outcome);
  };
  let next = 0;
  const work = async () => {
    while (next < requests.length) {
      const request = requests[next++]!;
      const stopped = now() > options.deadline || (await options.stop?.().catch(() => true));
      if (stopped) {
        report(request.id, { status: 'failed' });
        continue;
      }
      report(request.id, { status: 'generating' });
      try {
        report(request.id, { status: 'ready', asset: await generate(request) });
      } catch {
        report(request.id, { status: 'failed' });
      }
    }
  };
  const lanes = Math.min(Math.max(1, Math.floor(options.concurrency ?? 4)), requests.length);
  const done = Promise.all(Array.from({ length: lanes }, work)).then(() => undefined);
  return { outcomes, done };
}

/** The world with every outcome so far painted in; the input world is not changed. */
export function applyArt(world: WorldDoc, outcomes: Map<string, ArtOutcome>): WorldDoc {
  const next = structuredClone(world);
  for (const [id, outcome] of outcomes) {
    if (outcome.status !== 'ready') {
      next.assets[id] = { status: outcome.status };
      continue;
    }
    const { asset } = outcome;
    next.assets[id] = {
      status: 'ready',
      url: asset.url,
      ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
    };
    const ref: AssetRef = {
      status: 'ready',
      url: asset.url,
      width: asset.width,
      height: asset.height,
      ...(asset.animation ? { animation: asset.animation } : {}),
      ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
    };
    if (id === 'backdrop') {
      next.doc.theme.backdrop = ref;
      next.thumbnailUrl = asset.url;
      applyPaintedFloor(next.doc);
    } else if (id === 'midLayer') next.doc.theme.midLayer = ref;
    else {
      const entity = next.doc.entities.find((e) => e.id === id);
      if (entity) entity.asset = ref;
    }
  }
  return next;
}

/**
 * The art a new world asks for: the backdrop, the mid layer when there is one,
 * then sprites with the hero and characters first, capped by the plan.
 */
export function requestsFor(doc: SceneDoc, plan: PlanTier): ArtRequest[] {
  const hero = doc.learning.heroEntityId;
  const rank = (e: SceneDoc['entities'][number]) =>
    Number(e.id === hero) * 2 + Number(Boolean(e.character));
  return [
    { id: 'backdrop', description: doc.theme.backdropDescription, kind: 'backdrop', hero: true },
    ...(doc.theme.midLayerDescription
      ? [
          {
            id: 'midLayer',
            description: doc.theme.midLayerDescription,
            kind: 'overlay',
            hero: true,
          },
        ]
      : []),
    ...doc.entities
      .filter((e) => e.kind === 'sprite')
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, PLAN_LIMITS[plan].imagesPerWorld)
      .map((e) => ({
        id: e.id,
        description: e.description,
        kind: 'sprite',
        hero: e.id === hero || Boolean(e.character),
        ...(e.locomotion ? { locomotion: e.locomotion } : {}),
      })),
  ];
}
