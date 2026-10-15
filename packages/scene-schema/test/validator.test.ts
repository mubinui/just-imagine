import { describe, it, expect } from 'vitest';
import { validateScene } from '../src/validator';
import { minimalScene } from './helpers';

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('validateScene', () => {
  it('passes the minimal scene with no issues', () => {
    const r = validateScene(minimalScene());
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('reports SCHEMA_INVALID with a null doc for garbage', () => {
    const r = validateScene({ hello: 'world' });
    expect(r.ok).toBe(false);
    expect(r.doc).toBeNull();
    expect(codes(r)).toContain('SCHEMA_INVALID');
  });

  it('clamps an implausible known material and warns', () => {
    const doc = minimalScene();
    doc.materials['jelly'] = {
      density: 5,
      friction: 0.3,
      restitution: 0.6,
      softness: 0.8,
      buoyant: true,
      breakable: false,
      pretend: false,
    };
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    expect(r.doc?.materials['jelly']?.density).toBe(1.2);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'MATERIAL_CLAMPED', path: 'materials.jelly.density' }),
    );
  });

  it('keeps an implausible value when the material is marked pretend', () => {
    const doc = minimalScene();
    doc.materials['jelly'] = {
      density: 5,
      friction: 0.3,
      restitution: 0.6,
      softness: 0.8,
      buoyant: true,
      breakable: false,
      pretend: true,
    };
    const r = validateScene(doc);
    expect(r.doc?.materials['jelly']?.density).toBe(5);
    expect(codes(r)).not.toContain('MATERIAL_CLAMPED');
  });

  it('requires exactly one ground unless the medium is space', () => {
    const noGround = minimalScene();
    noGround.entities = noGround.entities.filter((e) => e.kind !== 'ground');
    noGround.rules = [];
    noGround.rules.push({
      id: 'r_tap',
      when: { event: 'tap', target: 'hero' },
      then: [{ action: 'celebrate', style: 'sparkle' }],
      concept: 'bounce',
      once: false,
    });
    expect(codes(validateScene(noGround))).toContain('GROUND_MISSING');

    noGround.environment.medium = 'space';
    expect(codes(validateScene(noGround))).not.toContain('GROUND_MISSING');

    const twoGrounds = minimalScene();
    twoGrounds.entities.push({
      ...twoGrounds.entities[0]!,
      id: 'ground2',
      transform: { x: 8, y: 0.5, rotation: 0 },
    });
    expect(codes(validateScene(twoGrounds))).toContain('GROUND_MULTIPLE');
  });

  it('reports UNKNOWN_TAG when a rule references a tag no entity has', () => {
    const doc = minimalScene();
    doc.rules[0]!.when = { event: 'collision', a: 'hero', b: 'lava' };
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_TAG', path: 'rules.0.when.b' }),
    );
  });

  it('reports UNKNOWN_ENTITY_REF for a spawn template or joint endpoint that does not exist', () => {
    const doc = minimalScene();
    doc.rules[0]!.then.push({ action: 'spawn', template: 'ghost', at: 'hero', count: 1 });
    doc.joints.push({ type: 'pin', a: 'ball', b: 'nothing', anchor: { x: 0, y: 0 } });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'rules.0.then.1.template' }),
    );
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'joints.0.b' }),
    );
  });

  it('reports UNKNOWN_MATERIAL_REF for an entity or setMaterial action', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.material = 'slime';
    doc.rules[0]!.then.push({ action: 'setMaterial', target: 'hero', material: 'goo' });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_MATERIAL_REF', path: 'entities.1.body.material' }),
    );
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_MATERIAL_REF', path: 'rules.0.then.1.material' }),
    );
  });

  it('moves an entity inside the bounds and warns', () => {
    const doc = minimalScene();
    doc.entities[1]!.transform.x = 20;
    doc.entities[1]!.transform.y = -3;
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    expect(r.doc?.entities[1]?.transform).toEqual({ x: 15.5, y: 0.5, rotation: 0 });
    expect(codes(r)).toContain('ENTITY_CLAMPED_TO_BOUNDS');
  });

  it('resizes a dynamic entity whose mass is below the minimum and warns', () => {
    const doc = minimalScene();
    doc.materials['feather'] = {
      density: 0.05,
      friction: 0.6,
      restitution: 0.1,
      softness: 0.5,
      buoyant: true,
      breakable: false,
      pretend: false,
    };
    doc.entities[1]!.body.material = 'feather';
    doc.entities[1]!.body.size = { width: 0.2, height: 0.2 };
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    const size = r.doc!.entities[1]!.body.size;
    expect(size.width).toBeCloseTo(0.4472, 3);
    expect(size.height).toBeCloseTo(0.4472, 3);
    expect(codes(r)).toContain('MASS_CLAMPED');
  });

  it('reports ENTITY_TOO_LARGE for a sprite wider than 8 m', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.size = { width: 10, height: 1 };
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('ENTITY_TOO_LARGE');
  });

  it('reports STATIC_OVERLAP for two overlapping static non-ground entities', () => {
    const doc = minimalScene();
    const cloud = (id: string, x: number) => ({
      id,
      kind: 'sprite' as const,
      name: 'cloud',
      description: 'fluffy cloud',
      body: {
        shape: 'box' as const,
        material: 'grass',
        isStatic: true,
        size: { width: 3, height: 1 },
      },
      transform: { x, y: 3, rotation: 0 },
      tags: ['cloud'],
      behaviors: [],
      pretend: false,
    });
    doc.entities.push(cloud('cloud1', 5), cloud('cloud2', 6));
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'STATIC_OVERLAP', path: 'entities.3' }),
    );
  });

  it('reports learning inconsistencies', () => {
    const doc = minimalScene();
    doc.learning.prediction.concept = 'buoyancy';
    doc.learning.heroEntityId = 'nobody';
    doc.rules[0]!.concept = undefined;
    doc.learning.dials = ['heroMaterial'];
    doc.materials = { rubber: doc.materials['rubber']!, grass: doc.materials['grass']! };
    doc.materials = { grass: doc.materials['grass']! };
    doc.entities[1]!.body.material = 'grass';
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        'LEARNING_CONCEPT_MISMATCH',
        'HERO_MISSING',
        'NO_CONCEPT_RULE',
        'DIAL_UNUSABLE',
      ]),
    );
  });

  it('reports BLOCKED_CATEGORY with the offending path', () => {
    const doc = minimalScene();
    doc.entities[1]!.description = 'a ball shaped like a gun';
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'BLOCKED_CATEGORY', path: 'entities.1.description' }),
    );
  });

  it('reports DUPLICATE_ID for repeated entity ids', () => {
    const doc = minimalScene();
    doc.entities.push({ ...doc.entities[1]!, transform: { x: 4, y: 2, rotation: 0 } });
    expect(codes(validateScene(doc))).toContain('DUPLICATE_ID');
  });

  it('does not mutate the input', () => {
    const doc = minimalScene();
    doc.entities[1]!.transform.x = 20;
    validateScene(doc);
    expect(doc.entities[1]!.transform.x).toBe(20);
  });
});
