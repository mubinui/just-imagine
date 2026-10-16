import { THEME_PALETTES, type ThemeId } from '@just-imagine/protocol';

/** Authored Dream Launch geometry; only controlled palette values enter the SVG. */
export function brandContents(theme?: ThemeId): string {
  const p = theme ? THEME_PALETTES[theme] : undefined;
  const accent = p?.accent ?? 'var(--accent, #245e4e)',
    peach = p?.peach ?? 'var(--peach, #f9ceb0)',
    yellow = p?.yellow ?? 'var(--yellow, #f7d76e)',
    ground = p?.ground ?? 'var(--ground, #fff9ee)';
  return `<rect width="100" height="100" rx="22" fill="${accent}"/><g fill="${peach}">${[
    [33.2, 44.5],
    [36.4, 40],
    [39.6, 36.5],
    [42.8, 34],
    [46, 32.5],
    [49.2, 32],
    [52.4, 32.5],
    [55.6, 34],
    [58.8, 36.5],
  ]
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.8"/>`)
    .join(
      '',
    )}</g><path d="M73 15.5 76.41 24.31 85.84 24.83 78.52 30.79 80.93 39.92 73 34.8 65.07 39.92 67.48 30.79 60.16 24.83 69.59 24.31Z" fill="${yellow}" stroke="${yellow}" stroke-width="3" stroke-linejoin="round"/><g fill="${ground}"><circle cx="36" cy="60" r="13"/><circle cx="51" cy="53" r="16"/><circle cx="67" cy="61" r="12"/><rect x="23" y="61" width="56" height="13" rx="6.5"/><circle cx="26" cy="82" r="4.5"/><circle cx="17" cy="90" r="2.8"/></g>`;
}
export function brandSvg(theme: ThemeId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${brandContents(theme)}</svg>`;
}
