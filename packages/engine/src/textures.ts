import { Texture } from 'pixi.js';
export class OpaqueOverlayError extends Error {}
/** Engine-owned textures never enter Pixi's global Assets cache. */
export class TextureLease {
  private entries = new Map<
    string,
    {
      promise: Promise<Texture>;
      controller: AbortController;
      texture?: Texture;
      bitmap?: ImageBitmap;
      overlaySafe?: boolean;
    }
  >();
  acquire(url: string): Promise<Texture> {
    const prior = this.entries.get(url);
    if (prior) return prior.promise;
    const controller = new AbortController();
    const entry: {
      promise: Promise<Texture>;
      controller: AbortController;
      texture?: Texture;
      bitmap?: ImageBitmap;
      overlaySafe?: boolean;
    } = { promise: Promise.resolve(null as unknown as Texture), controller };
    entry.promise = (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Asset unavailable');
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      if (controller.signal.aborted) {
        bitmap.close();
        throw new Error('Asset released');
      }
      entry.bitmap = bitmap;
      const texture = Texture.from(bitmap);
      entry.texture = texture;
      return texture;
    })().catch((error) => {
      if (this.entries.get(url) === entry) this.entries.delete(url);
      entry.texture?.destroy(true);
      entry.bitmap?.close();
      throw error;
    });
    this.entries.set(url, entry);
    return entry.promise;
  }
  /** An optional decorative layer must leave the authored backdrop visible. */
  async acquireOverlay(url: string): Promise<Texture> {
    const texture = await this.acquire(url);
    const entry = this.entries.get(url);
    if (!entry?.bitmap) throw new Error('Asset released');
    if (entry.overlaySafe === undefined) {
      entry.overlaySafe = false;
      try {
        const canvas =
          typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(64, 36)
            : Object.assign(document.createElement('canvas'), { width: 64, height: 36 });
        const ctx = canvas.getContext('2d') as
          CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (ctx) {
          ctx.drawImage(entry.bitmap, 0, 0, 64, 36);
          const pixels = ctx.getImageData(0, 0, 64, 36).data;
          let clear = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i]! < 32) clear++;
          entry.overlaySafe = clear / (64 * 36) >= 0.55;
        }
      } catch {
        /* An uninspectable optional plate cannot cover the backdrop. */
      }
    }
    if (!entry.overlaySafe) throw new OpaqueOverlayError('Decorative layer obscures the backdrop');
    return texture;
  }
  retain(urls: Set<string>) {
    for (const [url, e] of this.entries)
      if (!urls.has(url)) {
        e.controller.abort();
        e.texture?.destroy(true);
        e.bitmap?.close();
        this.entries.delete(url);
      }
  }
  dispose() {
    this.retain(new Set());
  }
}
