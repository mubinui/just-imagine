import { it, expect, vi, afterEach } from 'vitest';
vi.mock('pixi.js', () => ({ Texture: { from: vi.fn(() => ({ destroy: vi.fn() })) } }));
import { TextureLease, OpaqueOverlayError } from '../src/textures';
afterEach(() => vi.unstubAllGlobals());

function harness(clearFraction: number) {
  const bitmap = { close: vi.fn() };
  const pixels = new Uint8ClampedArray(64 * 36 * 4).fill(255);
  for (let i = 0; i < Math.floor(64 * 36 * clearFraction); i++) pixels[i * 4 + 3] = 0;
  const read = vi.fn(() => ({ data: pixels }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() })),
  );
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => bitmap),
  );
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      getContext() {
        return { drawImage: vi.fn(), getImageData: read };
      }
    },
  );
  return { lease: new TextureLease(), bitmap, read };
}
it('rejects an opaque legacy mid-layer but leaves ordinary backdrop and sprite acquisition available', async () => {
  const h = harness(0);
  await expect(h.lease.acquireOverlay('/opaque')).rejects.toBeInstanceOf(OpaqueOverlayError);
  await expect(h.lease.acquire('/opaque')).resolves.toBeDefined();
  await expect(h.lease.acquireOverlay('/opaque')).rejects.toBeInstanceOf(OpaqueOverlayError);
  expect(h.read).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledOnce();
  h.lease.dispose();
  expect(h.bitmap.close).toHaveBeenCalledOnce();
});
it('keeps genuinely transparent decorative overlays and releases their textures normally', async () => {
  const h = harness(0.75);
  await expect(h.lease.acquireOverlay('/decoration')).resolves.toBeDefined();
  h.lease.retain(new Set());
  expect(h.bitmap.close).toHaveBeenCalledOnce();
});
