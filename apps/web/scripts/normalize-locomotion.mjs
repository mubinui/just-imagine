// Deterministic sprite registration: identify complete alpha silhouettes rather than
// slicing through limbs when the generator does not obey equal-cell gutters.
import sharp from '../../../services/builder/node_modules/sharp/lib/index.js';
import { writeFile } from 'node:fs/promises';
const sources = {
  farm: 'animals-farm-locomotion-source-v2.png',
  jungle: 'animals-jungle-locomotion-source-v2.png',
  ocean: 'animals-ocean-locomotion-source-v2.png',
};
const root = 'docs/art/sources';
const dir = 'apps/web/public/learn/cinematic';
const report = [];
for (const [habitat, file] of Object.entries(sources)) {
  const input = await sharp(`${root}/${file}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const {
    data,
    info: { width: w, height: h },
  } = input;
  const labels = new Int32Array(w * h),
    groups = [];
  let id = 0;
  for (let at = 0; at < labels.length; at++) {
    if (labels[at] || data[at * 4 + 3] < 32) continue;
    id++;
    const stack = [at];
    labels[at] = id;
    let count = 0,
      left = w,
      right = 0,
      top = h,
      bottom = 0;
    while (stack.length) {
      const p = stack.pop(),
        x = p % w,
        y = Math.floor(p / w);
      count++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const n of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ])
        if (n >= 0 && !labels[n] && data[n * 4 + 3] >= 32) {
          labels[n] = id;
          stack.push(n);
        }
    }
    if (count > 2000)
      groups.push({
        id,
        count,
        left: Math.max(0, left - 3),
        right: Math.min(w, right + 4),
        top: Math.max(0, top - 3),
        bottom: Math.min(h, bottom + 4),
      });
  }
  if (groups.length !== 24)
    throw Error(`${habitat}: expected24 separate sprites, got${groups.length}`);
  groups.sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
  const layers = [];
  const frames = [];
  for (let row = 0; row < 4; row++) {
    const cells = groups.slice(row * 6, row * 6 + 6).sort((a, b) => a.left - b.left);
    const scale = Math.min(
      212 / Math.max(...cells.map((c) => c.right - c.left)),
      200 / Math.max(...cells.map((c) => c.bottom - c.top)),
    );
    for (let col = 0; col < 6; col++) {
      const c = cells[col],
        cw = c.right - c.left,
        ch = c.bottom - c.top,
        raw = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const source = (c.top + y) * w + c.left + x,
            label = labels[source];
          let keep = label === c.id;
          if (!label && data[source * 4 + 3] >= 8)
            for (let dy = -2; dy <= 2 && !keep; dy++)
              for (let dx = -2; dx <= 2 && !keep; dx++) {
                const px = c.left + x + dx,
                  py = c.top + y + dy;
                if (px >= 0 && px < w && py >= 0 && py < h && labels[py * w + px] === c.id)
                  keep = true;
              }
          if (keep) data.copy(raw, (y * cw + x) * 4, source * 4, source * 4 + 4);
        }
      const width = Math.round(cw * scale),
        height = Math.round(ch * scale),
        left = col * 256 + Math.floor((256 - width) / 2),
        top =
          row * 256 +
          (habitat === 'ocean' || (habitat === 'jungle' && row === 3)
            ? Math.floor((256 - height) / 2)
            : 228 - height);
      const png = await sharp(raw, { raw: { width: cw, height: ch, channels: 4 } })
        .resize(width, height)
        .png()
        .toBuffer();
      layers.push({ input: png, left, top });
      frames.push({ row, col, source: c, scale, width, height, left, top });
    }
  }
  const base = `${dir}/animals-${habitat}-locomotion-v2`;
  const png = await sharp({
    create: { width: 1536, height: 1024, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  await writeFile(base + '.png', png);
  await sharp(png)
    .webp({ quality: 88 })
    .toFile(base + '.webp');
  report.push({ habitat, source: `${root}/${file}`, frames });
}
await writeFile('docs/art/locomotion-registration.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  report.map((r) => ({
    habitat: r.habitat,
    frames: r.frames.length,
    sharedScalePerCharacter: true,
    clearGutters: true,
  })),
);
