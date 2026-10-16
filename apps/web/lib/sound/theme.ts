import type { SceneDoc } from '@just-imagine/scene-schema';
import type { MusicTheme } from './manifest';

// Picks a music bed from what the world is about. The asset library will carry an explicit theme;
// until then the world's medium, lab tier, water entities and palette hint decide.
export function musicThemeFor(doc: SceneDoc): MusicTheme {
  const text = `${doc.theme.paletteHint} ${doc.theme.backdropDescription}`;
  if (doc.environment.medium === 'space' || /\bmoon\b|space|planet|starry|galaxy/i.test(text))
    return 'moon';
  if (doc.tier === 'lab' || /lab|science/i.test(doc.theme.paletteHint)) return 'lab';
  if (doc.environment.medium === 'water' || doc.entities.some((e) => e.kind === 'water'))
    return 'pond';
  if (/sky|cloud/i.test(text)) return 'sky';
  if (/room|house|home|indoor|cosy|cozy/i.test(doc.theme.backdropDescription)) return 'room';
  return 'meadow';
}
