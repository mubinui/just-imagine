import { describe, expect, it } from 'vitest';
import { fromGenerated, GeneratedSceneSchema, type GeneratedScene } from '../src/gen';
import { toGeminiJsonSchema } from '../src/json-schema';
import { migrateScene } from '../src/migrate';
import { applyScenePatch, PatchOpsSchema, type PatchOp } from '../src/patch';
import { SceneDocSchema } from '../src/schema';
import { validateScene } from '../src/validator';
import { minimalScene } from './helpers';

function labScene() {
  const doc = minimalScene();
  doc.tier = 'lab';
  doc.visuals = [{ type: 'label', entity: 'ball', text: 'Ball' }];
  doc.challenges = [
    {
      id: 'ch_land',
      goal: 'Land on the ground',
      check: { event: 'collision', a: 'hero', b: 'ground' },
      hint: 'Drop the ball',
      concept: 'bounce',
      reward: [{ action: 'celebrate', style: 'sparkle' }],
    },
  ];
  return doc;
}

function generatedScene(): GeneratedScene {
  const {
    schemaVersion: _version,
    worldId: _worldId,
    theme,
    materials,
    entities,
    ...rest
  } = minimalScene();
  const { backdrop: _backdrop, midLayer: _midLayer, ...generatedTheme } = theme;
  return {
    ...rest,
    theme: generatedTheme,
    materials: Object.entries(materials).map(([name, material]) => ({ name, ...material })),
    entities: entities.map(({ asset: _asset, ...entity }) => entity),
  };
}

describe('scene boundary regressions', () => {
  it('rejects too many materials in persisted scenes', () => {
    const doc = minimalScene();
    for (let i = 0; i < 7; i++) doc.materials[`extra_${i}`] = { ...doc.materials['rubber']! };
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a prediction answer outside the supplied options', () => {
    const doc = minimalScene();
    doc.learning.prediction.correctIndex = 2;
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('requires vertices for a polygon body', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.shape = 'polygon';
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects terrain that cannot fit inside the world', () => {
    const doc = minimalScene();
    doc.entities[0]!.body.size.height = 16;
    expect(validateScene(doc).ok).toBe(false);
  });

  it('keeps the rotated body inside the world bounds', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.shape = 'box';
    doc.entities[1]!.body.size = { width: 1, height: 4 };
    doc.entities[1]!.transform = { x: 0.5, y: 2, rotation: Math.PI / 2 };
    const result = validateScene(doc);
    expect(result.ok).toBe(true);
    expect(result.doc?.entities[1]?.transform.x).toBeCloseTo(2);
  });

  it('rejects a rotated body that cannot fit inside the world', () => {
    const doc = minimalScene();
    doc.entities[0]!.transform.rotation = Math.PI / 2;
    expect(validateScene(doc).ok).toBe(false);
  });

  it('does not resolve inherited object properties as materials', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.material = 'constructor';
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_MATERIAL_REF', path: 'entities.1.body.material' }),
    );
  });

  it('checks all child-visible prediction and backdrop text', () => {
    const doc = minimalScene();
    doc.learning.prediction.options[0] = 'a gun';
    doc.theme.midLayerDescription = 'a zombie';
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'BLOCKED_CATEGORY',
          path: 'learning.prediction.options.0',
        }),
        expect.objectContaining({ code: 'BLOCKED_CATEGORY', path: 'theme.midLayerDescription' }),
      ]),
    );
  });
});

describe('generated scene regressions', () => {
  it('keeps the last duplicate material deterministically during conversion', () => {
    const generated = generatedScene();
    generated.materials.push({ ...generated.materials[1]!, restitution: 0.7 });
    expect(GeneratedSceneSchema.safeParse(generated).success).toBe(false);
    const doc = fromGenerated(generated, 'w_duplicate');
    expect(doc.materials['rubber']?.restitution).toBe(0.7);
    expect(validateScene(doc)).toMatchObject({ ok: true, issues: [] });
  });

  it('defaults the tier during conversion even when the caller skips parsing', () => {
    const generated = generatedScene();
    const { tier: _tier, ...withoutTier } = generated;
    expect(fromGenerated(withoutTier as GeneratedScene, 'w_default').tier).toBe('playground');
  });

  it('enforces the variable cap for generated scenes too', () => {
    const generated = generatedScene();
    generated.tier = 'lab';
    generated.variables = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [
        `v${i}`,
        {
          label: 'Gravity',
          min: 1,
          max: 20,
          step: 1,
          value: 10,
          unit: '',
          binds: { kind: 'gravity' },
        },
      ]),
    );
    expect(GeneratedSceneSchema.safeParse(generated).success).toBe(false);
  });
});

describe('patch boundary regressions', () => {
  it('rejects an empty or unsupported patch even if the caller skips parsing', () => {
    expect(applyScenePatch(minimalScene(), []).ok).toBe(false);
    const result = applyScenePatch(minimalScene(), [
      { op: 'merge', path: '/title', value: 'Changed' },
    ] as unknown as PatchOp[]);
    expect(result).toMatchObject({ ok: false, doc: null });
    expect(result.issues[0]?.code).toBe('PATCH_INVALID');
  });

  it('never mutates the input when a later operation fails', () => {
    const doc = minimalScene();
    const original = structuredClone(doc);
    const result = applyScenePatch(doc, [
      { op: 'replace', path: '/title', value: 'Changed' },
      { op: 'remove', path: '/entities/99' },
    ]);
    expect(result.ok).toBe(false);
    expect(doc).toEqual(original);
  });

  it('rejects prototype mutation paths', () => {
    const result = applyScenePatch(minimalScene(), [
      { op: 'add', path: '/__proto__/polluted', value: true },
    ]);
    expect(result).toMatchObject({ ok: false, doc: null });
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it('rejects invalid JSON pointer escapes', () => {
    expect(PatchOpsSchema.safeParse([{ op: 'remove', path: '/entities/~2' }]).success).toBe(false);
  });
});

describe('lab boundary regressions', () => {
  it('rejects unresolved targets in scale actions and challenge rewards', () => {
    const doc = labScene();
    doc.rules[0]!.then.push({ action: 'scaleEntity', target: 'ghost', factor: 1.5 });
    doc.challenges![0]!.reward = [
      { action: 'setMaterial', target: 'missing', material: 'unknown' },
    ];
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'UNKNOWN_TAG', path: 'rules.0.then.1.target' }),
        expect.objectContaining({ code: 'UNKNOWN_TAG', path: 'challenges.0.reward.0.target' }),
        expect.objectContaining({
          code: 'UNKNOWN_MATERIAL_REF',
          path: 'challenges.0.reward.0.material',
        }),
      ]),
    );
  });

  it('requires launch actions to target dynamic entities', () => {
    const doc = labScene();
    doc.rules[0]!.then.push({ action: 'launch', target: 'ground' });
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'LAUNCH_NEEDS_DYNAMIC' }));
  });

  it('rejects duplicate challenge and visual ids', () => {
    const doc = labScene();
    doc.challenges!.push(structuredClone(doc.challenges![0]!));
    const histogram = {
      type: 'histogram' as const,
      id: 'bins',
      title: 'Landings',
      bins: 4,
      source: { tag: 'hero', prop: 'x' as const },
    };
    doc.visuals = [histogram, structuredClone(histogram)];
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_ID', path: 'challenges.1.id' }),
        expect.objectContaining({ code: 'DUPLICATE_ID', path: 'visuals.1.id' }),
      ]),
    );
  });

  it('checks child-visible lab text and reward speech', () => {
    const doc = labScene();
    doc.visuals = [{ type: 'label', entity: 'ball', text: 'a gun' }];
    doc.challenges![0]!.reward = [{ action: 'say', text: 'a zombie' }];
    const result = validateScene(doc);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BLOCKED_CATEGORY', path: 'visuals.0.text' }),
        expect.objectContaining({ code: 'BLOCKED_CATEGORY', path: 'challenges.0.reward.0.text' }),
      ]),
    );
  });
});

describe('schema export and migration regressions', () => {
  it('preserves property names that happen to be schema keywords', () => {
    expect(
      toGeminiJsonSchema({
        type: 'object',
        properties: { default: { type: 'number', default: 2 } },
        required: ['default'],
      }),
    ).toEqual({
      type: 'object',
      properties: { default: { type: 'number' } },
      required: ['default'],
    });
  });

  it.each([NaN, Infinity, -1, 0, 0.5, 1.5])(
    'rejects invalid schema version %s',
    (schemaVersion) => {
      expect(migrateScene({ ...minimalScene(), schemaVersion })).toEqual({
        ok: false,
        reason: 'MISSING_VERSION',
      });
    },
  );
});
