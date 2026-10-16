import {
  AppearanceSchema,
  THEME_COLOR_KEYS,
  THEME_PALETTES,
  type Appearance,
  type ThemeId,
} from '@just-imagine/protocol';
import { brandSvg } from './brand';

export function themeStyle(theme: ThemeId): Record<string, string> {
  const palette = THEME_PALETTES[theme];
  return Object.fromEntries(THEME_COLOR_KEYS.map((key) => [`--${key}`, palette[key]]));
}
export function applyAppearance(input: Appearance): void {
  const appearance = AppearanceSchema.parse(input);
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  for (const [key, value] of Object.entries(themeStyle(appearance.theme)))
    root.style.setProperty(key, value);
  let icon = document.querySelector<HTMLLinkElement>('link[data-theme-icon]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.dataset.themeIcon = 'true';
    document.head.appendChild(icon);
  }
  icon.href = `data:image/svg+xml,${encodeURIComponent(brandSvg(appearance.theme))}`;
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = `/theme-manifest?theme=${appearance.theme}`;
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (apple) apple.href = `/icons/themes/${appearance.theme}/apple.png`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_PALETTES[appearance.theme].accent;
  try {
    localStorage.setItem('ji-appearance', JSON.stringify(appearance));
  } catch {
    /* Theme still works when browser storage is unavailable. */
  }
}
export function publishAppearance(appearance: Appearance): void {
  window.dispatchEvent(
    new CustomEvent('ji:appearance', { detail: AppearanceSchema.parse(appearance) }),
  );
}
