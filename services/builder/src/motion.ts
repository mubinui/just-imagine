import type { Locomotion, SceneDoc } from '@just-imagine/scene-schema';

export class MotionArtworkError extends Error {
  readonly retryable = false;
}
export function requireMotionArtwork(doc: SceneDoc) {
  if (
    doc.entities.some(
      (e) =>
        e.locomotion &&
        (e.asset?.status !== 'ready' || (e.locomotion.kind !== 'roll' && !e.asset.animation)),
    )
  )
    throw new MotionArtworkError(
      'The character animation could not finish. Please try the creation again.',
    );
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
  return `Production articulated ${motion.kind} sprite sheet of ${description.replace(/(?:glowing in )?(?:warm |soft )?rim light/gi, 'clean lighting')}. Exactly THREE columns and THREE rows, NINE chronological distinct poses. Same full character, same scale, near-side view facing ${motion.facing}. ${action} Fixed ground baseline for runners; fixed body centre for swimmers/flyers. Full body fits inside EACH cell with generous empty gutters. Flat pure ${background} background, fully opaque painted cartoon character. No shadow, glow, scenery, lettering, cell borders or extra character. Do not fill margins. No part touches image edges or another pose. This is an animation sheet, not a single centered portrait.`;
}
