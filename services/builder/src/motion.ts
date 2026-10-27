import type { Entity, Locomotion, SceneDoc } from '@just-imagine/scene-schema';
import type { MotionRegistrationCode } from './assets';

export function motionRepairInstruction(code: MotionRegistrationCode) {
  const issue = {
    BACKGROUND:
      'The key background was not clean. Use a perfectly flat replacement background outside the fully opaque character, no shadows, glow, or gradients.',
    CLIPPED:
      'Limbs or background touched a sheet edge. Shrink all nine poses equally and leave wide empty outer margins; restore every entire limb and tail.',
    POSE_COUNT:
      'The sheet did not contain exactly nine complete separate poses. Remove all drawn floor lines, registration guides and shadows that could join neighboring poses. Rebuild exactly three rows of three full-body poses; no overlapping, merged, extra, or missing characters.',
    LAYOUT:
      'Detached parts or row ordering were ambiguous. Keep each whole pose clearly separated, exactly three poses per row, in chronological order.',
  }[code];
  return `Animation repair: ${issue} Use the reference only to preserve the same character identity, markings, clothing, proportions and requested colors. Correct the sheet layout; do not invent a different character. Every frame needs a distinct articulated phase.`;
}

export class MotionArtworkError extends Error {
  readonly retryable = false;
}
export const hasMotionArtwork = (entity: Entity) =>
  !entity.locomotion ||
  (entity.asset?.status === 'ready' &&
    (entity.locomotion.kind === 'roll' || Boolean(entity.asset.animation)));
/**
 * A moving sprite without its motion artwork keeps still instead of failing the
 * world: its `locomotion` is removed. Returns the ids of the sprites changed.
 */
export function dropMissingMotion(doc: SceneDoc): string[] {
  const dropped: string[] = [];
  for (const entity of doc.entities) {
    if (hasMotionArtwork(entity)) continue;
    delete entity.locomotion;
    dropped.push(entity.id);
  }
  return dropped;
}
/** Speed/stride edits reuse the same owned art; different actions need new poses. */
export const motionArt = (motion?: Locomotion) =>
  motion
    ? {
        kind: motion.kind,
        facing: motion.facing,
        wheels: motion.wheels ?? null,
      }
    : null;
export const sameMotionArt = (a?: Locomotion, b?: Locomotion) =>
  JSON.stringify(motionArt(a)) === JSON.stringify(motionArt(b));

/** Keep sheet layout separate from single centered-sprite instructions. */
export function locomotionImagePrompt(description: string, motion: Locomotion, background: string) {
  const action =
    motion.kind === 'swim'
      ? 'Propel with articulated tail/flipper strokes, recovery and a steady body centre.'
      : motion.kind === 'fly'
        ? 'Articulate raised wings, downstroke, full extension, recovery and upstroke.'
        : 'Bend actual leg joints with alternating planted and lifted paws/feet. Row1 contact, down, passing. Row2 push-off, airborne, opposite contact. Row3 opposite down, passing, airborne recovery.';
  return `Tactile storybook animation with sculpted volume, clear internal shading and the requested materials; honor any explicit style in the character description. Production articulated ${motion.kind} sprite sheet of ${description.replace(/(?:glowing in )?(?:warm |soft )?rim light/gi, 'clean lighting')}. Exactly THREE columns and THREE rows, NINE chronological distinct poses. Same full character, same scale, near-side view facing ${motion.facing}. ${action} For runners, contact feet align at an INVISIBLE registration height: do not draw any ground line, floor, platform or guide. Swimmers/flyers share an invisible body-center anchor. Full body fits inside EACH cell with generous empty gutters. Flat pure ${background} background, fully opaque painted cartoon character. Nine separate islands of character paint with empty background between them. No shadow, glow, scenery, lettering, cell borders, registration marks, lines under paws or extra character. Do not fill margins. No part touches image edges or another pose. This is an animation sheet, not a single centered portrait.`;
}
