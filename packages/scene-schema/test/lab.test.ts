import { describe, it, expect } from 'vitest';
import { SceneDocSchema, type SceneDoc } from '../src/schema';
import { validateScene } from '../src/validator';
import { minimalScene } from './helpers';

function minimalLab(): SceneDoc {
  const doc = minimalScene();
  doc.tier = 'lab';
  doc.learning.concepts = ['projectile', 'gravity'];
  doc.learning.prediction.concept = 'projectile';
  doc.rules[0]!.concept = 'gravity';
  doc.variables = {
    launch_speed: {
      label: 'Launch speed',
      min: 2,
      max: 20,
      step: 0.5,
      value: 10,
      unit: 'm/s',
      binds: { kind: 'launch', entity: 'ball', prop: 'speed' },
    },
    gravity: {
      label: 'Gravity',
      min: 1,
      max: 25,
      step: 0.1,
      value: 9.81,
      unit: 'm/s²',
      binds: { kind: 'gravity' },
    },
  };
  doc.visuals = [
    {
      type: 'plot',
      id: 'height',
      title: 'Height over time',
      x: 'time',
      y: { entity: 'ball', prop: 'height' },
      maxSeconds: 6,
    },
    { type: 'vector', entity: 'ball', show: 'velocity' },
  ];
  doc.challenges = [
    {
      id: 'ch_ground',
      goal: 'Make the ball land past the middle',
      check: { event: 'collision', a: 'hero', b: 'ground' },
      hint: 'Try a bigger angle',
      concept: 'projectile',
      reward: [{ action: 'celebrate', style: 'confetti' }],
    },
  ];
  doc.rules.push({
    id: 'r_go',
    when: { event: 'tap', target: 'hero' },
    then: [{ action: 'launch', target: 'hero' }],
    once: false,
  });
  return doc;
}

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('lab extension', () => {
  it('parses and validates a minimal lab world', () => {
    expect(SceneDocSchema.safeParse(minimalLab()).success).toBe(true);
    const r = validateScene(minimalLab());
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('defaults tier to playground when absent', () => {
    const { tier: _t, ...withoutTier } = minimalScene();
    const parsed = SceneDocSchema.parse(withoutTier);
    expect(parsed.tier).toBe('playground');
  });

  it('rejects more than six variables at the schema level', () => {
    const doc = minimalLab();
    for (let i = 0; i < 6; i++) doc.variables![`v${i}`] = { ...doc.variables!['gravity']! };
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('reports VARIABLE_RANGE when value is outside min and max', () => {
    const doc = minimalLab();
    doc.variables!['gravity']!.value = 40;
    expect(codes(validateScene(doc))).toContain('VARIABLE_RANGE');
  });

  it('reports UNKNOWN_ENTITY_REF for a binding or visual on a missing entity', () => {
    const doc = minimalLab();
    doc.variables!['launch_speed']!.binds = { kind: 'launch', entity: 'rocket', prop: 'speed' };
    doc.visuals!.push({ type: 'label', entity: 'nobody', text: 'hi' });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_ENTITY_REF',
        path: 'variables.launch_speed.binds.entity',
      }),
    );
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'visuals.2.entity' }),
    );
  });

  it('reports LAUNCH_NEEDS_DYNAMIC when a launch variable targets a static entity', () => {
    const doc = minimalLab();
    doc.variables!['launch_speed']!.binds = { kind: 'launch', entity: 'ground', prop: 'speed' };
    expect(codes(validateScene(doc))).toContain('LAUNCH_NEEDS_DYNAMIC');
  });

  it('reports LAB_EMPTY for a lab with no variables or visuals, and PLAYGROUND_HAS_LAB_FIELDS the other way round', () => {
    const empty = minimalLab();
    delete empty.variables;
    delete empty.visuals;
    expect(codes(validateScene(empty))).toContain('LAB_EMPTY');
    const playground = minimalLab();
    playground.tier = 'playground';
    expect(codes(validateScene(playground))).toContain('PLAYGROUND_HAS_LAB_FIELDS');
  });

  it('reports UNKNOWN_CHALLENGE_REF when a rule waits on a challenge that does not exist', () => {
    const doc = minimalLab();
    doc.rules.push({
      id: 'r_done',
      when: { event: 'challengeComplete', id: 'ch_missing' },
      then: [{ action: 'sound', cue: 'ding' }],
      once: true,
    });
    expect(codes(validateScene(doc))).toContain('UNKNOWN_CHALLENGE_REF');
  });

  it('checks challenge concepts and tags like rules', () => {
    const doc = minimalLab();
    doc.challenges![0]!.concept = 'fraction';
    doc.challenges![0]!.check = { event: 'collision', a: 'hero', b: 'cup' };
    const r = validateScene(doc);
    expect(codes(r)).toEqual(expect.arrayContaining(['LEARNING_CONCEPT_MISMATCH', 'UNKNOWN_TAG']));
  });
});
