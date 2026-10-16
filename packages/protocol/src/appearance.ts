import { z } from 'zod';

/** Published interface colours only; no operator or private runtime configuration. */
export const ThemeIdSchema = z.enum(['forest', 'ocean', 'terracotta']);
export type ThemeId = z.infer<typeof ThemeIdSchema>;
export const AppearanceSchema = z.object({
  theme: ThemeIdSchema.default('forest'),
  revision: z.number().int().nonnegative().default(0),
});
export type Appearance = z.infer<typeof AppearanceSchema>;
export const SetAppearanceSchema = z.strictObject({
  theme: ThemeIdSchema,
  revision: z.number().int().nonnegative(),
  reason: z.string().trim().min(3).max(500),
});
export const APPEARANCE_PATH = 'config/appearance';
export const THEME_PALETTES = {
  forest: {
    name: 'Forest',
    description: 'Warm cream and familiar forest green.',
    ground: '#fff9ee',
    surface: '#fffdf7',
    ink: '#243e36',
    soft: '#51675c',
    accent: '#245e4e',
    'accent-ink': '#fffaf1',
    line: '#d6decb',
    peach: '#f9ceb0',
    yellow: '#f7d76e',
    mint: '#d5e7c9',
    focus: '#ad6524',
  },
  ocean: {
    name: 'Ocean',
    description: 'Sea glass, deep blue and soft sand.',
    ground: '#f6fbfa',
    surface: '#ffffff',
    ink: '#193c4a',
    soft: '#486671',
    accent: '#1d6276',
    'accent-ink': '#ffffff',
    line: '#ccdfdf',
    peach: '#f6d5b4',
    yellow: '#f5d98a',
    mint: '#cce8e3',
    focus: '#9c5524',
  },
  terracotta: {
    name: 'Terracotta',
    description: 'Baked clay, apricot and warm ivory.',
    ground: '#fff7ed',
    surface: '#fffcf6',
    ink: '#4b322b',
    soft: '#70564d',
    accent: '#8d4639',
    'accent-ink': '#fffaf1',
    line: '#e4d3c2',
    peach: '#f6c7a5',
    yellow: '#f8d786',
    mint: '#e2e9cf',
    focus: '#8d4639',
  },
} as const;
export const THEME_COLOR_KEYS = [
  'ground',
  'surface',
  'ink',
  'soft',
  'accent',
  'accent-ink',
  'line',
  'peach',
  'yellow',
  'mint',
  'focus',
] as const;
