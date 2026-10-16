import { describe, expect, it } from 'vitest';
import { AppearanceSchema, SetAppearanceSchema, THEME_PALETTES } from '../src/appearance';
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe('published appearance boundary', () => {
  it('defaults safely and excludes private configuration', () => {
    expect(AppearanceSchema.parse({})).toEqual({ theme: 'forest', revision: 0 });
    expect(
      AppearanceSchema.parse({ theme: 'ocean', revision: 1, operatorEmail: 'private' }),
    ).toEqual({ theme: 'ocean', revision: 1 });
    expect(
      SetAppearanceSchema.safeParse({ theme: 'url(evil)', revision: 0, reason: 'Change' }).success,
    ).toBe(false);
    expect(
      SetAppearanceSchema.safeParse({ theme: 'forest', revision: -1, reason: 'Change' }).success,
    ).toBe(false);
    expect(
      SetAppearanceSchema.safeParse({ theme: 'forest', revision: 0, reason: ' ' }).success,
    ).toBe(false);
  });
  for (const [name, p] of Object.entries(THEME_PALETTES))
    it(`${name} retains readable body, button, stage and focus colours`, () => {
      for (const [fg, bg] of [
        [p.ink, p.ground],
        [p.soft, p.ground],
        [p.ink, p.surface],
        [p.soft, p.surface],
        [p['accent-ink'], p.accent],
        [p.ink, p.yellow],
        [p.ground, p.ink],
        [p.ink, p.mint],
      ])
        expect(contrast(fg!, bg!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.focus, p.ground)).toBeGreaterThanOrEqual(3);
      expect(contrast(p.yellow, p.ink)).toBeGreaterThanOrEqual(3);
    });
});
