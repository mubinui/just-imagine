import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { musicThemeFor } from '../lib/sound/theme';

describe('musicThemeFor', () => {
  it('maps the fixture worlds to fitting beds', () => {
    expect(musicThemeFor(FIXTURE_WORLDS.moonBounce)).toBe('moon');
    expect(musicThemeFor(FIXTURE_WORLDS.projectileLab)).toBe('lab');
    expect(musicThemeFor(FIXTURE_WORLDS.pondFloat)).toBe('pond');
    expect(musicThemeFor(FIXTURE_WORLDS.jellyDragon)).toBe('sky');
  });
  it('falls back to the meadow', () => {
    const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
    doc.theme.paletteHint = 'warm greens';
    doc.theme.backdropDescription = 'a grassy field with flowers';
    expect(musicThemeFor(doc)).toBe('meadow');
  });
});
