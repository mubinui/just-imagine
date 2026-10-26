import { LIMITS, validateScene, type Entity, type SceneDoc } from '@just-imagine/scene-schema';
import { logEvent } from '@just-imagine/server-core';
import { CHARACTERS, type BuildWorldJob } from '@just-imagine/protocol';

type CompanionId = NonNullable<BuildWorldJob['companionId']>;

/** Why the scene's hero cannot act, or null when it names a dynamic sprite. */
export function heroProblem(doc: SceneDoc): string | null {
  const hero = doc.entities.find((entity) => entity.id === doc.learning.heroEntityId);
  if (!hero) return `hero entity "${doc.learning.heroEntityId}" is missing`;
  if (hero.kind !== 'sprite') return `hero "${hero.id}" is a ${hero.kind}, not a sprite`;
  if (hero.body.isStatic) return `hero "${hero.id}" is a static body`;
  return null;
}

/** The child's friend drawn as a small sprite; its voice stays the companion's own, so no character metadata. */
export function companionHeroEntity(companionId: CompanionId, material: string): Entity {
  return {
    id: companionId,
    kind: 'sprite',
    name: CHARACTERS[companionId].displayName.slice(0, 40),
    description: CHARACTERS[companionId].look.slice(0, 200),
    body: { shape: 'auto', material, isStatic: false, size: { width: 1, height: 1 } },
    transform: { x: 3, y: 7.5, rotation: 0 },
    tags: ['hero', companionId],
    behaviors: [],
    pretend: false,
  };
}

function heroInsertFailed(doc: SceneDoc, job: BuildWorldJob, reason: string): SceneDoc {
  logEvent('hero_insert_failed', {
    jobId: job.jobId,
    worldId: job.worldId,
    reason,
    count: doc.entities.length,
  });
  return doc;
}

/**
 * Makes sure the scene has a hero that can act. When the child named nobody, the
 * friend holding the mic becomes the hero. Never throws; returns the input when
 * nothing can be done.
 */
export function ensureHero(doc: SceneDoc, job: BuildWorldJob): SceneDoc {
  if (heroProblem(doc) === null || !job.companionId) return doc;
  const next = structuredClone(doc);
  if (next.entities.length >= LIMITS.maxEntities) {
    // No room to insert: point at the first thing that can act.
    const actor = next.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic);
    if (!actor) return heroInsertFailed(doc, job, 'full_no_actor');
    next.learning.heroEntityId = actor.id;
    return validateScene(next).ok ? next : heroInsertFailed(doc, job, 'invalid_after_repoint');
  }
  const ids = new Set(next.entities.map((e) => e.id));
  let id: string = job.companionId;
  for (let n = 2; ids.has(id); n += 1) id = `${job.companionId}_${n}`;
  const ground = next.entities.find((e) => e.kind === 'ground');
  const dynamic = next.entities.find((e) => e.kind === 'sprite' && !e.body.isStatic);
  const material = dynamic?.body.material ?? Object.keys(next.materials)[0] ?? 'wood';
  const hero = companionHeroEntity(job.companionId, material);
  hero.id = id;
  if (ground) hero.transform.y = ground.transform.y - ground.body.size.height / 2 - 0.5;
  next.entities.push(hero);
  next.learning.heroEntityId = id;
  const checked = validateScene(next);
  return checked.ok && checked.doc
    ? checked.doc
    : heroInsertFailed(doc, job, 'invalid_after_insert');
}
