// One-time generator for the painted stand-in library in apps/web/public/standins/.
// Not run in CI. Each generic subject is drawn by the hero image model through the builder's
// own image call and cleaned by the builder's own processSprite, then capped at 512 px.
// The three friend frames are cut from the friends acting sheet instead of generated.
// Usage (from services/builder):
//   set -a && . ../../.env.local && set +a && tsx scripts/make-standins.mts [key ...] [--friends]
// Set STANDIN_RAW_DIR to keep the raw model PNGs for review (never commit them); with
// --from-raw, a subject whose raw PNG is already there is re-cut instead of redrawn.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { VertexModels } from '../src/vertex.ts';
import { processSprite } from '../src/assets.ts';

const OUT = fileURLToPath(new URL('../../../apps/web/public/standins/', import.meta.url));
const SHEET = fileURLToPath(
  new URL(
    '../../../apps/web/public/characters/acting/friends-pets-acting-v2.webp',
    import.meta.url,
  ),
);
const MAX_SIDE = 512;

export const SUBJECTS: Record<string, string> = {
  car: 'small rounded toy car',
  truck: 'small rounded toy pickup truck with opaque painted windows',
  ball: 'bouncy striped play ball',
  rocket: 'little rounded toy rocket lying sideways, no flame or smoke',
  boat: 'little wooden sailboat',
  robot: 'small round toy robot',
  dog: 'small puppy dog standing on four legs',
  cat: 'small cat standing on four legs',
  bird: 'small round songbird',
  fish: 'small round fish',
  child: 'young child with short neat hair in simple play clothes, standing',
  crate: 'plain wooden crate seen flat from the side',
};

/** The brief's frame, with the builder's own chroma-key sprite clause so processSprite can cut it. */
export function standInPrompt(subject: string, background: string): string {
  return (
    `Single transparent 2D game sprite for the Just Imagine children's physics playground: one friendly ${subject}, side view facing right, broad simple readable silhouette, warm painterly 2D cartoon with soft rounded forms, premium picture-book gouache feel, cheerful but not goofy. Entire subject visible and centered with generous transparent padding. ` +
    `Full body, centered, flat pure ${background} background, no ground, no cast shadow, no props, no text, no border, no scene. ` +
    `Render the character as an opaque painted cartoon: use internal highlights for jelly, glass or light, never let the chroma background show through the body. Crisp clean silhouette, no outer glow, no floating particles, no background shadow, no text. The flat background color is only outside the silhouette.`
  );
}

const apiKey = process.env['GEMINI_API_KEY'];
const redact = (text: string) => (apiKey ? text.replaceAll(apiKey, '[redacted]') : text);
const print = (text: string) => process.stderr.write(redact(text) + '\n');

async function capped(webp: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const out = await sharp(webp)
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

async function generate(
  models: VertexModels,
  key: string,
  rawDir: string | undefined,
  fromRaw: boolean,
) {
  const subject = SUBJECTS[key];
  if (!subject) throw new Error(`Unknown stand-in ${key}`);
  let chroma: 'magenta' | 'green' = 'magenta';
  for (let attempt = 0; attempt < 2; attempt++) {
    const background = chroma === 'green' ? 'green #00FF00' : 'magenta #FF00FF';
    const saved = rawDir ? `${rawDir}/${key}-${chroma}.png` : undefined;
    const raw =
      fromRaw && saved && existsSync(saved)
        ? readFileSync(saved)
        : await models.image(standInPrompt(subject, background), true);
    if (saved) writeFileSync(saved, raw);
    // The builder's despill and exterior matte: no key-coloured fringe, no key left in gaps.
    const sprite = await processSprite(raw, chroma, true, false, true);
    // The same cutout gate the builder applies before accepting a generated sprite.
    if (sprite.backgroundFraction > 0.02 || sprite.borderOpaqueFraction > 0.05) {
      print(`${key}: ${chroma} cutout failed, retrying on green`);
      chroma = 'green';
      continue;
    }
    const out = await capped(sprite.webp);
    writeFileSync(`${OUT}${key}.webp`, out.data);
    print(`${key}.webp ${out.width}x${out.height} ${out.data.length} bytes (${chroma})`);
    return;
  }
  throw new Error(`${key}: no clean cutout`);
}

async function cutFriends() {
  const meta = await sharp(SHEET).metadata();
  const cellW = Math.floor(meta.width! / 8),
    cellH = Math.floor(meta.height! / 3);
  for (const [row, id] of ['mishti', 'bhombol', 'chandni'].entries()) {
    const { data, info } = await sharp(SHEET)
      .extract({ left: 0, top: row * cellH, width: cellW, height: cellH })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let minX = info.width,
      minY = info.height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3]! > 8) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
    if (maxX < minX) throw new Error(`${id}: empty cell`);
    const trimmed = await sharp(data, { raw: info })
      .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
      .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
    const out = await capped(trimmed);
    writeFileSync(`${OUT}friend-${id}.webp`, out.data);
    print(
      `friend-${id}.webp ${out.width}x${out.height} ${out.data.length} bytes (row ${row}, column 0, cell ${cellW}x${cellH})`,
    );
  }
}

const args = process.argv.slice(2);
const keys = args.filter((a) => !a.startsWith('--'));
const friends = args.includes('--friends');
const rawDir = process.env['STANDIN_RAW_DIR'];
if (rawDir) mkdirSync(rawDir, { recursive: true });
mkdirSync(OUT, { recursive: true });
try {
  if (friends) await cutFriends();
  const wanted = keys.length || friends ? keys : Object.keys(SUBJECTS);
  if (wanted.length) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    const models = new VertexModels({
      project: 'demo-just-imagine-local',
      apiKey,
      sceneModel: '',
      fastModel: '',
      heroModel: 'gemini-nano-banana-2.1',
      propModel: 'gemini-3.1-flash-lite-image',
    });
    const failures: string[] = [];
    await Promise.all(
      wanted.map((key) =>
        generate(models, key, rawDir, args.includes('--from-raw')).catch((error: unknown) => {
          failures.push(key);
          print(`${key} failed: ${error instanceof Error ? error.message : String(error)}`);
        }),
      ),
    );
    if (failures.length) process.exitCode = 1;
  }
} catch (error) {
  print(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
