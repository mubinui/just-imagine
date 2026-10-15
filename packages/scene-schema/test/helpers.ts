import type { SceneDoc } from '../src/schema';

export function minimalScene(): SceneDoc {
  return {
    schemaVersion: 1,
    worldId: 'w_test',
    tier: 'playground',
    title: 'Test World',
    theme: {
      paletteHint: 'pastel',
      timeOfDay: 'day',
      backdropDescription: 'a sunny meadow with soft hills',
      backdrop: { url: '', width: 1920, height: 1080, status: 'placeholder' },
    },
    environment: {
      gravity: { x: 0, y: 9.81 },
      wind: { x: 0, y: 0 },
      medium: 'air',
      bounds: { width: 16, height: 9 },
      seed: 1,
    },
    materials: {
      grass: {
        density: 1,
        friction: 0.8,
        restitution: 0.1,
        softness: 0,
        buoyant: false,
        breakable: false,
        pretend: false,
      },
      rubber: {
        density: 1.1,
        friction: 0.8,
        restitution: 0.8,
        softness: 0.2,
        buoyant: false,
        breakable: false,
        pretend: false,
      },
    },
    entities: [
      {
        id: 'ground',
        kind: 'ground',
        name: 'meadow',
        description: 'green meadow ground',
        body: { shape: 'box', material: 'grass', isStatic: true, size: { width: 16, height: 1 } },
        transform: { x: 8, y: 8.5, rotation: 0 },
        tags: ['ground'],
        behaviors: [],
        pretend: false,
      },
      {
        id: 'ball',
        kind: 'sprite',
        name: 'bouncy ball',
        description: 'red rubber bouncy ball',
        body: {
          shape: 'circle',
          material: 'rubber',
          isStatic: false,
          size: { width: 1, height: 1 },
        },
        transform: { x: 8, y: 2, rotation: 0 },
        tags: ['ball', 'hero'],
        behaviors: [],
        pretend: false,
      },
    ],
    joints: [],
    rules: [
      {
        id: 'r_bounce',
        when: { event: 'collision', a: 'hero', b: 'ground', minImpulse: 1 },
        then: [{ action: 'sound', cue: 'boing' }],
        concept: 'bounce',
        once: true,
      },
    ],
    learning: {
      concepts: ['bounce', 'gravity'],
      prediction: {
        question: 'Will the ball bounce or stop?',
        options: ['bounce', 'stop'],
        correctIndex: 0,
        concept: 'bounce',
      },
      dials: ['gravity'],
      heroEntityId: 'ball',
    },
    narration: { intro: 'Here is a bouncy ball. Tap it!' },
  };
}
