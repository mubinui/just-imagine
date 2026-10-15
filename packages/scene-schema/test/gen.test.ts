import { describe, it, expect } from 'vitest';
import { GeneratedSceneSchema, fromGenerated, type GeneratedScene } from '../src/gen';
import { SceneDocSchema } from '../src/schema';
import { minimalScene } from './helpers';

function minimalGenerated(): GeneratedScene {
  const { schemaVersion: _v, worldId: _w, theme, materials, entities, ...rest } = minimalScene();
  return {
    ...rest,
    theme: {
      paletteHint: theme.paletteHint,
      timeOfDay: theme.timeOfDay,
      backdropDescription: theme.backdropDescription,
    },
    materials: Object.entries(materials).map(([name, m]) => ({ name, ...m })),
    entities: entities.map(({ asset: _a, ...e }) => e),
  };
}

describe('GeneratedSceneSchema', () => {
  it('accepts a minimal generated scene', () => {
    expect(GeneratedSceneSchema.safeParse(minimalGenerated()).success).toBe(true);
  });

  it('rejects duplicate material names', () => {
    const gen = minimalGenerated();
    gen.materials.push({ ...gen.materials[0]! });
    expect(GeneratedSceneSchema.safeParse(gen).success).toBe(false);
  });

  it('rejects an entity with an asset', () => {
    const gen = minimalGenerated() as unknown as { entities: Record<string, unknown>[] };
    gen.entities[1]!['asset'] = { url: 'x', width: 1, height: 1, status: 'ready' };
    expect(GeneratedSceneSchema.safeParse(gen).success).toBe(false);
  });
});

describe('fromGenerated', () => {
  it('produces a valid SceneDoc with placeholder assets', () => {
    const doc = fromGenerated(minimalGenerated(), 'w_abc');
    expect(SceneDocSchema.safeParse(doc).success).toBe(true);
    expect(doc.worldId).toBe('w_abc');
    expect(doc.schemaVersion).toBe(1);
    expect(doc.theme.backdrop.status).toBe('placeholder');
    expect(doc.theme.backdrop.url).toBe('');
    expect(Object.keys(doc.materials)).toEqual(['grass', 'rubber']);
    expect(doc.entities.every((e) => e.asset === undefined)).toBe(true);
  });

  it('adds a mid layer placeholder only when a description is present', () => {
    const gen = minimalGenerated();
    expect(fromGenerated(gen, 'w1').theme.midLayer).toBeUndefined();
    gen.theme.midLayerDescription = 'soft distant hills';
    const doc = fromGenerated(gen, 'w1');
    expect(doc.theme.midLayer?.status).toBe('placeholder');
    expect(doc.theme.midLayerDescription).toBe('soft distant hills');
  });
});
