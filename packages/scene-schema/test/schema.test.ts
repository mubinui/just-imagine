import { describe, it, expect } from 'vitest';
import { SceneDocSchema } from '../src/schema';
import { LIMITS } from '../src/limits';
import { minimalScene } from './helpers';

describe('SceneDocSchema', () => {
  it('accepts a minimal valid scene', () => {
    expect(SceneDocSchema.safeParse(minimalScene()).success).toBe(true);
  });

  it('rejects more than the entity limit', () => {
    const doc = minimalScene();
    const template = doc.entities[1]!;
    doc.entities = Array.from({ length: LIMITS.maxEntities + 1 }, (_, i) => ({
      ...template,
      id: `e${i}`,
    }));
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects an uppercase entity id', () => {
    const doc = minimalScene();
    doc.entities[1]!.id = 'Ball';
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects an unknown behavior type', () => {
    const doc = minimalScene() as unknown as { entities: { behaviors: unknown[] }[] };
    doc.entities[1]!.behaviors.push({ type: 'teleport' });
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects bounds other than 16 by 9', () => {
    const doc = minimalScene() as unknown as { environment: { bounds: { width: number } } };
    doc.environment.bounds.width = 20;
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a schemaVersion other than 1', () => {
    const doc = { ...minimalScene(), schemaVersion: 2 };
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a material density above the limit', () => {
    const doc = minimalScene();
    doc.materials['rubber']!.density = LIMITS.density.max + 1;
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a prediction with one option', () => {
    const doc = minimalScene();
    doc.learning.prediction.options = ['only'];
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });
});
