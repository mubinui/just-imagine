// Registration only: preserve generated alpha/colors and fit equal cells to shared row scale.
import sharp from '../../../services/builder/node_modules/sharp/lib/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
const root = 'docs/art/sources';
const inputs = [
  ['specialist-pets', 'exec-d48ab0f1-0608-4485-bc9a-25e21aad87ec', 3],
  ['specialist-guides', 'exec-279aa63d-ec00-4281-885e-b797315074eb', 3],
  ['katha', 'exec-d2f78ef2-4861-4a7a-a66c-262003c97da3', 1],
];
const report = [];
await mkdir('apps/web/public/characters/specialists', { recursive: true });
for (const [name, source, rows] of inputs) {
  const path = `${root}/${name}-source-v1.png`;
  void source;
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cw = info.width / 8,
    ch = info.height / rows;
  const layers = [];
  for (let row = 0; row < rows; row++) {
    const bounds = [];
    for (let col = 0; col < 8; col++) {
      let l = cw,
        r = 0,
        t = ch,
        b = 0;
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          if (data[((row * ch + y) * info.width + col * cw + x) * 4 + 3] > 48) {
            l = Math.min(l, x);
            r = Math.max(r, x);
            t = Math.min(t, y);
            b = Math.max(b, y);
          }
        }
      bounds.push({
        left: Math.max(0, l - 2),
        top: Math.max(0, t - 2),
        width: Math.min(cw, r + 3) - Math.max(0, l - 2),
        height: Math.min(ch, b + 3) - Math.max(0, t - 2),
      });
    }
    const scale = Math.min(
      224 / Math.max(...bounds.map((b) => b.width)),
      224 / Math.max(...bounds.map((b) => b.height)),
    );
    for (let col = 0; col < 8; col++) {
      const b = bounds[col];
      const width = Math.round(b.width * scale),
        height = Math.round(b.height * scale);
      const sprite = await sharp(path)
        .extract({
          left: col * cw + b.left,
          top: row * ch + b.top,
          width: b.width,
          height: b.height,
        })
        .resize(width, height)
        .png()
        .toBuffer();
      layers.push({
        input: sprite,
        left: col * 256 + Math.round((256 - width) / 2),
        top: row * 256 + 240 - height,
      });
    }
    report.push({ name, row, scale, bounds });
  }
  const result = sharp({
    create: {
      width: 2048,
      height: rows * 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(layers);
  await result.clone().png().toFile(`apps/web/public/characters/specialists/${name}-v1.png`);
  await result
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(`apps/web/public/characters/specialists/${name}-v1.webp`);
}
await writeFile('docs/art/specialist-registration.json', JSON.stringify(report, null, 2));
