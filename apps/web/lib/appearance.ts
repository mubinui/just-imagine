import {
  AppearanceSchema,
  ThemeIdSchema,
  THEME_COLOR_KEYS,
  THEME_PALETTES,
  type Appearance,
  type ThemeId,
} from '@just-imagine/protocol';
import { brandSvg } from './brand';

export const APPEARANCE_CACHE_KEY = 'ji-appearance';
export const THEME_PREFERENCE_KEY = 'ji-theme-preference';
export type ThemePreference = 'default' | ThemeId;
export type AppearanceSnapshot = {
  preference: ThemePreference;
  published: Appearance;
  theme: ThemeId;
  preferenceSaved: boolean;
};
const SERVER_SNAPSHOT: AppearanceSnapshot = {
  preference: 'default',
  published: { theme: 'forest', revision: 0 },
  theme: 'forest',
  preferenceSaved: true,
};
let snapshot = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

export function parseThemePreference(value: unknown): ThemePreference {
  const result = ThemeIdSchema.safeParse(value);
  return result.success ? result.data : 'default';
}
export function getAppearanceSnapshot(): AppearanceSnapshot {
  return snapshot;
}
export function getAppearanceServerSnapshot(): AppearanceSnapshot {
  return SERVER_SNAPSHOT;
}
export function subscribeAppearance(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function resolveAppearance(
  published: Appearance,
  preference: ThemePreference,
  preferenceSaved = snapshot.preferenceSaved,
) {
  const theme = preference === 'default' ? published.theme : preference;
  const changed =
    snapshot.preference !== preference ||
    snapshot.published.theme !== published.theme ||
    snapshot.published.revision !== published.revision ||
    snapshot.preferenceSaved !== preferenceSaved;
  snapshot = changed ? { preference, published, theme, preferenceSaved } : snapshot;
  renderTheme(theme);
  if (changed) listeners.forEach((listener) => listener());
}
/** The previous key remains a published-default cache, never a personal preference. */
export function initializeAppearance() {
  if (initialized) return;
  initialized = true;
  let published = snapshot.published,
    preference: ThemePreference = 'default',
    preferenceSaved = true;
  try {
    preference = parseThemePreference(localStorage.getItem(THEME_PREFERENCE_KEY));
  } catch {
    preferenceSaved = false;
  }
  try {
    const cached = AppearanceSchema.safeParse(
      JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) ?? 'null'),
    );
    if (cached.success) published = cached.data;
  } catch {
    /* Missing or malformed cache retains the usable Forest default. */
  }
  resolveAppearance(published, preference, preferenceSaved);
}
/** An unavailable browser store still permits a working choice for this visit. */
export function setThemePreference(value: ThemePreference): boolean {
  if (value !== 'default' && !ThemeIdSchema.safeParse(value).success) return false;
  initializeAppearance();
  let saved = true;
  try {
    if (value === 'default') localStorage.removeItem(THEME_PREFERENCE_KEY);
    else localStorage.setItem(THEME_PREFERENCE_KEY, value);
  } catch {
    saved = false;
  }
  resolveAppearance(snapshot.published, value, saved);
  return saved;
}
/** Storage events synchronize choices without writing them back to other tabs. */
export function syncThemePreference(value: string | null) {
  resolveAppearance(snapshot.published, parseThemePreference(value), true);
}
export function themeStyle(theme: ThemeId): Record<string, string> {
  const palette = THEME_PALETTES[theme];
  return Object.fromEntries(THEME_COLOR_KEYS.map((key) => [`--${key}`, palette[key]]));
}
function renderTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = snapshot.preference;
  for (const [key, value] of Object.entries(themeStyle(theme))) root.style.setProperty(key, value);
  let icon = document.querySelector<HTMLLinkElement>('link[data-theme-icon]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.dataset.themeIcon = 'true';
    document.head.appendChild(icon);
  }
  icon.href = `data:image/svg+xml,${encodeURIComponent(brandSvg(theme))}`;
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest)
    manifest.href = `/theme-manifest?theme=${theme}&lang=${root.lang.startsWith('bn') ? 'bn' : 'en'}`;
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (apple) apple.href = `/icons/themes/${theme}/apple.png`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_PALETTES[theme].accent;
}
/** Accept a published default; a personal choice always takes precedence. */
export function applyAppearance(input: Appearance, cache = true): void {
  const appearance = AppearanceSchema.parse(input);
  // A fresh API read is authoritative; an old cache from another tab is not.
  if (!cache && appearance.revision < snapshot.published.revision) return;
  if (cache) {
    try {
      localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(appearance));
    } catch {
      /* Offline cache failure does not interrupt the current appearance. */
    }
  }
  resolveAppearance(appearance, snapshot.preference);
}
export function publishAppearance(appearance: Appearance): void {
  window.dispatchEvent(
    new CustomEvent('ji:appearance', { detail: AppearanceSchema.parse(appearance) }),
  );
}

/** Kept outside React so polling, event races and cleanup have direct regressions. */
export function startAppearanceUpdates(apiUrl: string): () => void {
  initializeAppearance();
  let active = true,
    generation = 0,
    request: AbortController | undefined;
  const invalidate = () => {
    generation++;
    request?.abort();
  };
  async function refresh() {
    invalidate();
    const current = generation;
    request = new AbortController();
    try {
      const response = await fetch(`${apiUrl}/v1/appearance`, {
        cache: 'no-store',
        signal: request.signal,
      });
      if (!response.ok) return;
      const result = AppearanceSchema.safeParse(await response.json());
      if (active && current === generation && result.success) applyAppearance(result.data);
    } catch {
      /* Retain the validated default and personal choice while offline. */
    }
  }
  const published = (event: Event) => {
    const result = AppearanceSchema.safeParse((event as CustomEvent).detail);
    if (result.success) {
      invalidate();
      applyAppearance(result.data);
    }
  };
  const storage = (event: StorageEvent) => {
    try {
      if (event.storageArea && event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    if (event.key === THEME_PREFERENCE_KEY || event.key === null)
      syncThemePreference(event.newValue);
    if (event.key === APPEARANCE_CACHE_KEY && event.newValue) {
      try {
        const result = AppearanceSchema.safeParse(JSON.parse(event.newValue));
        if (result.success) {
          invalidate();
          applyAppearance(result.data, false);
        }
      } catch {
        /* A malformed cache from another tab never becomes CSS. */
      }
    }
  };
  const visible = () => {
    if (!document.hidden) void refresh();
  };
  window.addEventListener('ji:appearance', published);
  window.addEventListener('storage', storage);
  window.addEventListener('focus', visible);
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(visible, 30000);
  void refresh();
  return () => {
    active = false;
    invalidate();
    clearInterval(timer);
    window.removeEventListener('ji:appearance', published);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', visible);
    document.removeEventListener('visibilitychange', visible);
  };
}
