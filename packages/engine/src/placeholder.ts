import { WorldGraphics as Graphics } from './world-graphics';
import type { Entity, SceneDoc } from '@just-imagine/scene-schema';
/** Honest geometric placeholders: silhouettes follow physics, never invented characters. */
export function placeholder(entity: Entity) {
  const { width: w, height: h } = entity.body.size,
    g = new Graphics(),
    material = entity.body.material;
  if (entity.tags.includes('painted_ground') || entity.tags.includes('painted_water')) return g;
  if (entity.tags.includes('striped_ball')) {
    const r = Math.min(w, h) / 2;
    g.circle(0, 0, r).fill(0xe49b47).stroke({ width: 0.035, color: 0x885831 });
    g.moveTo(-r * 0.8, -r * 0.25)
      .lineTo(r * 0.8, r * 0.25)
      .stroke({ width: r * 0.28, color: 0xfff9ee });
    g.circle(-r * 0.3, -r * 0.45, r * 0.2).fill({ color: 0xffffff, alpha: 0.7 });
    return g;
  }
  if (entity.tags.includes('toy_bolt')) {
    for (let i = 0; i <= 6; i++) {
      const a = (i * Math.PI) / 3;
      if (i) g.lineTo((Math.cos(a) * w) / 2, (Math.sin(a) * h) / 2);
      else g.moveTo((Math.cos(a) * w) / 2, (Math.sin(a) * h) / 2);
    }
    g.fill(0x9baeb1).stroke({ width: 0.04, color: 0xdbe4dc });
    g.circle(0, 0, w * 0.23)
      .fill(0x405d59)
      .stroke({ width: 0.06, color: 0xcbd7d2 });
    return g;
  }
  if (entity.tags.includes('fraction_whole') || entity.tags.includes('fraction_half')) {
    g.roundRect(-w / 2, -h / 2, w, h, 0.15)
      .fill(0xc7794d)
      .stroke({ width: 0.05, color: 0x8c5035 });
    const pieces = entity.tags.includes('fraction_whole') ? 4 : 2;
    for (let i = 0; i < pieces; i++)
      g.roundRect(
        -w / 2 + (i * w) / pieces + 0.1,
        -h / 2 + 0.1,
        w / pieces - 0.2,
        h - 0.2,
        0.1,
      ).fill(0xe6ac72);
    return g;
  }
  if (entity.tags.includes('peg'))
    return g
      .circle(0, 0, w / 2)
      .fill(0xad794d)
      .stroke({ width: 0.05, color: 0xffedbf })
      .circle(-w * 0.1, -h * 0.1, w * 0.1)
      .fill(0xffedbf);
  if (entity.tags.includes('release_control') || entity.tags.includes('join_control')) {
    g.roundRect(-w / 2, -h / 2, w, h, 0.15).fill(0x245e4e);
    g.moveTo(-w * 0.2, -h * 0.15)
      .lineTo(0, h * 0.2)
      .lineTo(w * 0.2, -h * 0.15)
      .stroke({ width: 0.08, color: 0xfff9ee });
    return g;
  }
  const color =
    entity.kind === 'ground'
      ? 0xfff9ee
      : entity.kind === 'water'
        ? 0x9ddbe6
        : entity.body.isStatic
          ? 0x245e4e
          : material.includes('jelly')
            ? 0xa7cfad
            : material.includes('stone') || material.includes('metal')
              ? 0x9aa9a4
              : entity.tags.includes('hero')
                ? 0xf7d76e
                : 0xf9ceb0;
  if (entity.body.shape === 'circle') g.circle(0, 0, Math.min(w, h) / 2);
  else if (entity.body.shape === 'polygon' && entity.body.vertices) {
    entity.body.vertices.forEach((v, i) => (i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)));
    const first = entity.body.vertices[0]!;
    g.lineTo(first.x, first.y);
  } else if (entity.kind === 'ground') g.rect(-w / 2, -h / 2, w, h);
  else g.roundRect(-w / 2, -h / 2, w, h, Math.min(0.12, w / 4, h / 4));
  return g
    .fill({ color, alpha: entity.kind === 'water' ? 0.5 : 1 })
    .stroke({ width: 0.025, color: 0x245e4e, alpha: entity.kind === 'water' ? 0.2 : 0.45 });
}

/** Physical counting board and fraction workmat, drawn as crisp game geometry. */
export function playSurface(doc: SceneDoc): Graphics {
  const g = new Graphics();
  if (doc.entities.some((e) => e.tags.includes('peg'))) {
    g.rect(0, 0, 16, 9).fill(0xd9e7cc);
    g.roundRect(0.2, 0.2, 15.6, 8.6, 0.35).fill(0xc39566);
    g.roundRect(0.4, 0.4, 15.2, 8.2, 0.3).fill(0xf4e4c3);
    [0xd9e7cc, 0xf5d19d, 0xe8b199, 0xbcdcd4].forEach((color, i) =>
      g.roundRect(i * 4 + 0.25, 6.6, 3.5, 1.3, 0.15).fill(color),
    );
  } else if (doc.visuals?.some((v) => v.type === 'fraction')) {
    g.rect(0, 0, 16, 9).fill(0xe7ead7);
    g.roundRect(0.65, 0.65, 14.7, 7.3, 0.35).fill(0xfff4dc);
    g.moveTo(8, 3).lineTo(8, 7.6).stroke({ width: 0.025, color: 0xd4c3a4 });
  }
  return g;
}
