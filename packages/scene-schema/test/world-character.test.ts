import { it, expect } from 'vitest';
import { validateScene, SceneCharacterSchema } from '../src/index';
import { minimalScene } from './helpers';

it('allows an incidental creative world without a compulsory ground or teaching rule', () => {
  const doc = minimalScene();
  doc.learning.mode = 'incidental';
  doc.entities = doc.entities.filter((entity) => entity.kind !== 'ground');
  doc.rules = [];
  expect(validateScene(doc).ok).toBe(true);
  delete doc.learning.mode;
  const checked = validateScene(doc);
  expect(checked.issues.some((issue) => issue.code === 'GROUND_MISSING')).toBe(true);
  expect(checked.issues.some((issue) => issue.code === 'NO_CONCEPT_RULE')).toBe(true);
});

it('preserves generated conversational characters and game-rule controls on ordinary worlds', () => {
  const doc = minimalScene();
  doc.entities[1]!.character = {
    name: 'Earth',
    personality: 'Warm and curious',
    greeting: 'Come explore with me!',
    topic: 'Oceans and life',
  };
  doc.variables = {
    orbit_speed: {
      label: 'Orbit speed',
      min: 0.1,
      max: 3,
      step: 0.1,
      value: 1,
      unit: '×',
      binds: { kind: 'game' },
    },
  };
  const checked = validateScene(doc);
  expect(checked.ok).toBe(true);
  expect(checked.doc?.entities[1]!.character?.name).toBe('Earth');
  expect(checked.doc?.variables?.orbit_speed?.binds).toEqual({ kind: 'game' });
  doc.variables.orbit_speed!.binds = { kind: 'gravity' };
  expect(validateScene(doc).issues.some((i) => i.code === 'PLAYGROUND_HAS_LAB_FIELDS')).toBe(true);
});
it('validates character bounds and screens all character instructions as content', () => {
  expect(SceneCharacterSchema.safeParse({ name: 'Earth' }).success).toBe(false);
  const doc = minimalScene();
  doc.entities[1]!.character = {
    name: 'Earth',
    personality: 'gun',
    greeting: 'Hello',
    topic: 'Space',
  };
  const checked = validateScene(doc);
  expect(checked.ok).toBe(false);
  expect(
    checked.issues.some(
      (i) => i.code === 'BLOCKED_CATEGORY' && i.path.includes('character.personality'),
    ),
  ).toBe(true);
});
