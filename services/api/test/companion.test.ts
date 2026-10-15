import { it, expect } from 'vitest';
import sharp from 'sharp';
import { normalizePhoto } from '../src/companion';
import { CreateCompanionBodySchema } from '@just-imagine/protocol';
const base = {
  name: 'Pip',
  characterId: 'bhombol' as const,
  consent: true as const,
  mimeType: 'image/png' as const,
};
it('accepts a real image, strips metadata and re-encodes the source', async () => {
  const photo = await sharp({
    create: { width: 40, height: 30, channels: 3, background: '#f7d76e' },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const normalized = await normalizePhoto({ ...base, photo: photo.toString('base64') });
  const metadata = await sharp(normalized).metadata();
  expect(metadata.format).toBe('jpeg');
  expect(metadata.exif).toBeUndefined();
});
it('rejects fake MIME types, oversized inputs and missing parental permission', async () => {
  const photo = await sharp({
    create: { width: 10, height: 10, channels: 3, background: '#fff9ee' },
  })
    .webp()
    .toBuffer();
  await expect(normalizePhoto({ ...base, photo: photo.toString('base64') })).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    normalizePhoto({ ...base, photo: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }),
  ).rejects.toMatchObject({ status: 400 });
  expect(
    CreateCompanionBodySchema.safeParse({ ...base, consent: false, photo: 'AAAA' }).success,
  ).toBe(false);
});
