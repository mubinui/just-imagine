import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_PALETTES } from '@just-imagine/protocol';

let store: Map<string, string>;
let storage: {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};
let root: {
  dataset: Record<string, string>;
  lang: string;
  style: { setProperty: ReturnType<typeof vi.fn> };
};
let links: Record<string, { href?: string; content?: string; dataset?: Record<string, string> }>;
let stop = () => {};

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
function storageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  store = new Map();
  storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
  };
  root = { dataset: {}, lang: 'bn-BD', style: { setProperty: vi.fn() } };
  links = {
    'link[rel="manifest"]': {},
    'link[rel="apple-touch-icon"]': {},
    'meta[name="theme-color"]': {},
  };
  const doc = Object.assign(new EventTarget(), {
    documentElement: root,
    hidden: false,
    querySelector: (selector: string) => links[selector] ?? null,
    createElement: () => ({ dataset: {} }),
    head: {
      appendChild: (element: (typeof links)[string]) => {
        links['link[data-theme-icon]'] = element;
      },
    },
  });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: storage }));
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ theme: 'forest', revision: 0 }) }),
  );
  stop = () => {};
});
afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('personal appearance precedence', () => {
  it('accepts only closed preset preferences and rejects malformed caches on reload', async () => {
    store.set('ji-theme-preference', 'url(evil)');
    store.set('ji-appearance', '{broken');
    const appearance = await import('../lib/appearance');
    appearance.initializeAppearance();
    expect(appearance.getAppearanceSnapshot()).toMatchObject({
      preference: 'default',
      theme: 'forest',
    });
    for (const value of ['forest', 'ocean', 'terracotta'])
      expect(appearance.parseThemePreference(value)).toBe(value);
    for (const value of [null, {}, 'dark', 'url(evil)', 'default'])
      expect(appearance.parseThemePreference(value)).toBe('default');
  });

  it('restores the personal preset separately from the cached published default and resets to the latest default', async () => {
    store.set('ji-theme-preference', 'ocean');
    store.set('ji-appearance', JSON.stringify({ theme: 'terracotta', revision: 4 }));
    const appearance = await import('../lib/appearance');
    appearance.initializeAppearance();
    expect(appearance.getAppearanceSnapshot()).toMatchObject({
      preference: 'ocean',
      theme: 'ocean',
      published: { theme: 'terracotta', revision: 4 },
    });
    appearance.applyAppearance({ theme: 'forest', revision: 5 });
    expect(root.dataset.theme).toBe('ocean');
    expect(JSON.parse(store.get('ji-appearance')!)).toEqual({ theme: 'forest', revision: 5 });
    appearance.setThemePreference('default');
    expect(root.dataset.theme).toBe('forest');
    expect(store.has('ji-theme-preference')).toBe(false);
    expect(appearance.getAppearanceServerSnapshot()).toMatchObject({
      preference: 'default',
      theme: 'forest',
    });
  });

  it('updates every root color and browser asset from the same effective personal palette without publishing', async () => {
    const appearance = await import('../lib/appearance');
    appearance.initializeAppearance();
    const published = vi.fn();
    window.addEventListener('ji:appearance', published);
    appearance.setThemePreference('terracotta');
    for (const [key, value] of Object.entries(appearance.themeStyle('terracotta')))
      expect(root.style.setProperty).toHaveBeenCalledWith(key, value);
    expect(links['link[data-theme-icon]']?.href).toContain(
      encodeURIComponent(THEME_PALETTES.terracotta.accent),
    );
    expect(links['link[rel="manifest"]']?.href).toBe('/theme-manifest?theme=terracotta&lang=bn');
    expect(links['link[rel="apple-touch-icon"]']?.href).toBe('/icons/themes/terracotta/apple.png');
    expect(links['meta[name="theme-color"]']?.content).toBe(THEME_PALETTES.terracotta.accent);
    expect(published).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(store.get('ji-theme-preference')).toBe('terracotta');
    expect(appearance.themeStyle('ocean')['--accent']).toBe(THEME_PALETTES.ocean.accent);
  });

  it('keeps a choice usable for the visit when browser storage is unavailable', async () => {
    storage.getItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    storage.setItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    storage.removeItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    const appearance = await import('../lib/appearance');
    appearance.initializeAppearance();
    expect(appearance.setThemePreference('ocean')).toBe(false);
    appearance.applyAppearance({ theme: 'terracotta', revision: 1 });
    appearance.initializeAppearance();
    expect(appearance.getAppearanceSnapshot()).toMatchObject({
      preference: 'ocean',
      theme: 'ocean',
      preferenceSaved: false,
    });
    appearance.setThemePreference('default');
    expect(root.dataset.theme).toBe('terracotta');
  });
});

describe('appearance provider lifecycle', () => {
  it('revalidates a cached published default against the authoritative API on reload', async () => {
    store.set('ji-appearance', JSON.stringify({ theme: 'terracotta', revision: 99 }));
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'ocean', revision: 1 }),
    } as Response);
    const appearance = await import('../lib/appearance');
    stop = appearance.startAppearanceUpdates('https://api.example');
    expect(root.dataset.theme).toBe('terracotta');
    await flush();
    expect(root.dataset.theme).toBe('ocean');
    expect(appearance.getAppearanceSnapshot().published.revision).toBe(1);
  });

  it('preserves personal choice during initial fetch, polling and operator publication, then follows the latest default', async () => {
    const response = vi.mocked(fetch);
    response.mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'terracotta', revision: 2 }),
    } as Response);
    const appearance = await import('../lib/appearance');
    stop = appearance.startAppearanceUpdates('https://api.example');
    appearance.setThemePreference('ocean');
    await flush();
    await vi.advanceTimersByTimeAsync(30000);
    appearance.publishAppearance({ theme: 'forest', revision: 3 });
    expect(root.dataset.theme).toBe('ocean');
    expect(appearance.getAppearanceSnapshot().published).toEqual({ theme: 'forest', revision: 3 });
    appearance.setThemePreference('default');
    expect(root.dataset.theme).toBe('forest');
    expect(response).toHaveBeenCalledTimes(2);
    for (const [, options] of response.mock.calls) expect(options?.method).toBeUndefined();
  });

  it('synchronizes preference changes and published-cache updates across tabs without write-back loops', async () => {
    const appearance = await import('../lib/appearance');
    stop = appearance.startAppearanceUpdates('https://api.example');
    await flush();
    storage.setItem.mockClear();
    storageEvent('ji-theme-preference', 'ocean');
    storageEvent('ji-appearance', JSON.stringify({ theme: 'terracotta', revision: 2 }));
    expect(root.dataset.theme).toBe('ocean');
    storageEvent('ji-theme-preference', null);
    expect(root.dataset.theme).toBe('terracotta');
    storageEvent('ji-appearance', JSON.stringify({ theme: 'forest', revision: 1 }));
    storageEvent('ji-appearance', '{broken');
    expect(root.dataset.theme).toBe('terracotta');
    storageEvent(null, null);
    expect(appearance.getAppearanceSnapshot().preference).toBe('default');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('ignores an old request after publication and removes polling and listeners on unmount', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const appearance = await import('../lib/appearance');
    stop = appearance.startAppearanceUpdates('https://api.example');
    appearance.publishAppearance({ theme: 'ocean', revision: 2 });
    finish({ ok: true, json: async () => ({ theme: 'forest', revision: 1 }) } as Response);
    await flush();
    expect(root.dataset.theme).toBe('ocean');
    stop();
    await vi.advanceTimersByTimeAsync(60000);
    window.dispatchEvent(new Event('focus'));
    storageEvent('ji-theme-preference', 'terracotta');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(root.dataset.theme).toBe('ocean');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains the last valid appearance when offline or receiving an invalid public payload', async () => {
    store.set('ji-theme-preference', 'ocean');
    store.set('ji-appearance', JSON.stringify({ theme: 'terracotta', revision: 3 }));
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ theme: 'url(evil)', revision: 4 }),
      } as Response);
    const appearance = await import('../lib/appearance');
    stop = appearance.startAppearanceUpdates('https://api.example');
    await flush();
    await vi.advanceTimersByTimeAsync(30000);
    expect(root.dataset.theme).toBe('ocean');
    appearance.setThemePreference('default');
    expect(root.dataset.theme).toBe('terracotta');
  });
});
