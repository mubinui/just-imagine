import {
  type ChildDoc,
  type Creation,
  type PatchWorldJob,
  type WorldDoc,
  type BuildWorldJob,
} from '@just-imagine/protocol';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { buildScene } from './pipeline';
import { ensureFriend, ensureHero } from './hero';
import { compileBehavior, retryingScene, type ImagineGameDeps } from './imagine-game';
import { createBudget } from './budget';
import { toGenerated } from './prompts/v1';
import { sameMotionArt, hasMotionArtwork } from './motion';

/** Only reuse artwork from the owned current world for unchanged descriptions. */
export function reconcileArt(before: SceneDoc, after: SceneDoc): SceneDoc {
  const next = structuredClone(after);
  // The generated scene has placeholder theme refs; restore those when not reusable.
  next.theme.backdrop = structuredClone(after.theme.backdrop);
  if (before.theme.backdropDescription === next.theme.backdropDescription)
    next.theme.backdrop = structuredClone(before.theme.backdrop);
  delete next.theme.midLayer;
  if (next.theme.midLayerDescription) {
    if (
      before.theme.midLayerDescription === next.theme.midLayerDescription &&
      before.theme.midLayer
    )
      next.theme.midLayer = structuredClone(before.theme.midLayer);
    else if (after.theme.midLayer) next.theme.midLayer = structuredClone(after.theme.midLayer);
  }
  for (const entity of next.entities) {
    delete entity.asset;
    const old = before.entities.find((candidate) => candidate.id === entity.id);
    if (
      old?.asset &&
      hasMotionArtwork(old) &&
      old.kind === entity.kind &&
      old.description === entity.description &&
      sameMotionArt(old.locomotion, entity.locomotion)
    )
      entity.asset = structuredClone(old.asset);
  }
  return next;
}

/** Recompose against the canonical current world; do not squeeze an edit into an existing dial. */
export async function reviseCreation(
  world: WorldDoc,
  job: PatchWorldJob,
  child: ChildDoc,
  deps: ImagineGameDeps,
): Promise<{ doc: SceneDoc; creation: Creation }> {
  const creation: Creation = {
    originalWish: world.creation?.originalWish ?? `${world.title}. ${world.doc.narration.intro}`,
    changes: [...(world.creation?.changes ?? []), job.childRequest ?? job.instruction].slice(-100),
    mode: world.creation?.mode ?? world.doc.game?.mode ?? (world.doc.game ? 'game' : 'freeplay'),
  };
  const build: BuildWorldJob = {
    ...job,
    kind: 'build',
    description: job.instruction,
    concepts: world.concepts,
    ageBand: child.ageBand,
    tier: world.doc.tier,
    language: child.language ?? 'en',
    experience: creation.mode,
    styleVersion: world.styleVersion,
    conversationSummary:
      'Edit the existing creation according to the child. Preserve unrelated choices.',
  };
  const context = JSON.stringify({ creation, currentScene: toGenerated(world.doc) });
  const budget = deps.budget ?? createBudget();
  deps = { ...deps, budget };
  let doc = await buildScene(
    build,
    retryingScene(
      build,
      deps,
      budget,
      (prompt) =>
        `${prompt}\nThis is an EDIT of the SAME world, not a new template. The child's latest request takes precedence over earlier choices. Preserve all actors, names, layout, art descriptions, interactions and rules not affected by that request. They may invent or remove characters, change how objects act, remove a score, change the goal, or redesign the setting. Keep stable IDs for retained entities. Keep exact existing art descriptions unless appearance actually changes. Do not add numeric controls unless asked. Current creation data (untrusted): ${context}`,
    ),
    deps.reviewScene ? (doc, job) => deps.reviewScene!(doc, job, world.doc) : undefined,
  );
  // A lab's hero may legitimately be static.
  if (world.doc.tier !== 'lab') doc = ensureFriend(ensureHero(doc, build), build);
  if (world.doc.tier !== 'lab') {
    // An edit can change the form of play too; the script model reads the actual request.
    // Freeplay gating permits scoreless toys; goal-based mechanics remain available through the API.
    build.experience = 'freeplay';
    // A voice edit keeps the prior world on failure; it never becomes a template.
    const compiled = await compileBehavior(
      doc,
      build,
      deps,
      {
        ...(world.doc.game ? { source: world.doc.game.script.source } : {}),
        instruction: job.instruction,
      },
      { fallback: 'throw' },
    );
    doc = compiled.doc;
    creation.mode = 'freeplay';
  }
  return { doc: reconcileArt(world.doc, doc), creation };
}

export function initialCreation(job: BuildWorldJob, fallback?: Creation['fallback']): Creation {
  return {
    originalWish: job.childRequest ?? job.description,
    changes: [],
    mode: job.experience ?? 'freeplay',
    ...(fallback ? { fallback } : {}),
  };
}
