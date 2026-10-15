import { Texture } from 'pixi.js';
/** Engine-owned textures never enter Pixi's global Assets cache. */
export class TextureLease {
  private entries = new Map<
    string,
    {
      promise: Promise<Texture>;
      controller: AbortController;
      texture?: Texture;
      bitmap?: ImageBitmap;
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
