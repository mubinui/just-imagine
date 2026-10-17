import type { SceneDoc } from '@just-imagine/scene-schema';

/** An approved painting supplies the base floor, while all physical bodies stay unchanged. */
export function applyPaintedFloor(doc: SceneDoc) {
  if (doc.tier !== 'playground' || !doc.game || doc.theme.backdrop.status !== 'ready') return;
  const { width, height } = doc.environment.bounds;
  for (const entity of doc.entities) {
    const size = entity.body.size,
      at = entity.transform;
    const base =
      entity.kind === 'ground' &&
      entity.body.isStatic &&
      size.height <= height * 0.3 &&
      at.x - size.width / 2 <= 0.1 &&
      at.x + size.width / 2 >= width - 0.1 &&
      at.y + size.height / 2 >= height - 0.1;
    if (base && !entity.tags.includes('painted_ground')) entity.tags.push('painted_ground');
  }
}
