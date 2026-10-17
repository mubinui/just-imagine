import { it, expect } from 'vitest';
import sharp from 'sharp';
import { layerArtPrompt, processLayerArt } from '../src/layer-art';

it('preserves full-canvas placement, clears the key, and retains the authored decoration', async () => {
  const raw = await sharp({
    create: { width: 320, height: 180, channels: 4, background: '#ff00ff' },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 30, height: 30, channels: 4, background: '#e5be61' },
        })
          .png()
          .toBuffer(),
        left: 250,
        top: 20,
      },
    ])
    .png()
    .toBuffer();
  const result = await processLayerArt(raw, 'magenta');
  expect([result.width, result.height]).toEqual([2048, 1152]);
  const { data, info } = await sharp(result.webp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(data[(600 * info.width + 1000) * 4 + 3]).toBe(0);
  expect(data[(200 * info.width + 1700) * 4 + 3]).toBeGreaterThan(240);
  expect(layerArtPrompt('Cosmic stardust', 'magenta #FF00FF')).toContain(
    'No sky painting, landscape',
  );
});
it('rejects a second opaque landscape instead of publishing it above the requested world', async () => {
  const raw = await sharp({
    create: { width: 320, height: 180, channels: 4, background: '#304a39' },
  })
    .png()
    .toBuffer();
  await expect(processLayerArt(raw, 'magenta')).rejects.toThrow(/backdrop transparent/);
  const empty = await sharp({
    create: { width: 320, height: 180, channels: 4, background: '#00000000' },
  })
    .png()
    .toBuffer();
  await expect(processLayerArt(empty, 'magenta')).rejects.toThrow(/no visible artwork/);
});
