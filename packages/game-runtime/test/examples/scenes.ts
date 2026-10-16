import { SceneDocSchema, type SceneDoc, type Entity, type Dial } from '@just-imagine/scene-schema';

interface EntitySpec {
  id: string;
  tags: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  material?: string;
  shape?: 'box' | 'circle';
  isStatic?: boolean;
  rotation?: number;
  kind?: Entity['kind'];
  name?: string;
}

interface SceneSpec {
  id: string;
  title: string;
  hero: string;
  entities: EntitySpec[];
  gravity?: number;
  dials?: Dial[];
  concept?: SceneDoc['learning']['concepts'][number];
}

const material = (density: number, friction: number, restitution: number) => ({
  density,
  friction,
  restitution,
  softness: 0,
  buoyant: false,
  breakable: false,
  pretend: false,
});

const MATERIALS = {
  wood: material(0.6, 0.5, 0.2),
  stone: material(2.5, 0.7, 0.1),
  rubber: material(1.1, 0.8, 0.85),
  ice: material(0.9, 0.02, 0.1),
  soap: material(0.1, 0.1, 0.5),
  metal: material(1, 0.4, 0.2),
};

const placeholder = { url: '', width: 1920, height: 1080, status: 'placeholder' as const };

function entity(spec: EntitySpec): Entity {
  return {
    id: spec.id,
    kind: spec.kind ?? (spec.isStatic && spec.tags.includes('ground') ? 'ground' : 'sprite'),
    name: spec.name ?? spec.id.replace(/_/g, ' '),
    description: `${spec.name ?? spec.id.replace(/_/g, ' ')} in a painted cartoon world`,
    body: {
      shape: spec.shape ?? 'box',
      material: spec.material ?? 'wood',
      isStatic: spec.isStatic ?? false,
      size: { width: spec.w, height: spec.h },
    },
    transform: { x: spec.x, y: spec.y, rotation: spec.rotation ?? 0 },
    tags: spec.tags,
    behaviors: [],
    pretend: false,
  };
}

const ground = (tags: string[] = ['ground'], material = 'stone'): EntitySpec => ({
  id: 'ground',
  tags,
  x: 8,
  y: 8.5,
  w: 16,
  h: 1,
  material,
  isStatic: true,
});

function scene(spec: SceneSpec): SceneDoc {
  return SceneDocSchema.parse({
    schemaVersion: 1,
    worldId: `w_example_${spec.id}`,
    tier: 'playground',
    title: spec.title,
    theme: {
      paletteHint: 'soft pastel',
      timeOfDay: 'day',
      backdropDescription: `a painted cartoon backdrop for ${spec.title}`,
      backdrop: placeholder,
    },
    environment: {
      gravity: { x: 0, y: spec.gravity ?? 9.81 },
      wind: { x: 0, y: 0 },
      medium: 'air',
      bounds: { width: 16, height: 9 },
      seed: 7,
    },
    materials: MATERIALS,
    entities: spec.entities.map(entity),
    joints: [],
    rules: [],
    learning: {
      concepts: [spec.concept ?? 'force'],
      prediction: {
        question: 'What happens next?',
        options: ['It moves', 'It stays'],
        correctIndex: 0,
        concept: spec.concept ?? 'force',
      },
      dials: spec.dials ?? ['gravity'],
      heroEntityId: spec.hero,
    },
    narration: { intro: `Welcome to ${spec.title}!` },
  });
}

export const EXAMPLE_SCENES = {
  'catch-the-flies': scene({
    id: 'flies',
    title: 'Catch the Flies',
    hero: 'frog',
    dials: ['gravity'],
    entities: [
      ground(),
      {
        id: 'frog',
        tags: ['frog', 'hero'],
        x: 3,
        y: 7.5,
        w: 1,
        h: 1,
        shape: 'circle',
        material: 'rubber',
      },
      { id: 'fly_1', tags: ['fly'], x: 5, y: 2, w: 0.4, h: 0.4, shape: 'circle', material: 'soap' },
      { id: 'fly_2', tags: ['fly'], x: 9, y: 3, w: 0.4, h: 0.4, shape: 'circle', material: 'soap' },
      {
        id: 'fly_3',
        tags: ['fly'],
        x: 12,
        y: 2,
        w: 0.4,
        h: 0.4,
        shape: 'circle',
        material: 'soap',
      },
      {
        id: 'owl',
        tags: ['owl'],
        x: 14.5,
        y: 1.5,
        w: 1.2,
        h: 1.2,
        isStatic: true,
        name: 'sleeping owl',
      },
    ],
  }),
  'stack-higher-than-the-giraffe': scene({
    id: 'stack',
    title: 'Stack Higher Than the Giraffe',
    hero: 'block',
    dials: ['wind'],
    concept: 'balance',
    entities: [
      ground(),
      { id: 'block', tags: ['block'], x: 8, y: 7.7, w: 0.8, h: 0.6, material: 'wood' },
      { id: 'giraffe', tags: ['giraffe'], x: 12.5, y: 6.5, w: 1, h: 3, isStatic: true },
    ],
  }),
  'snail-race-in-the-rain': scene({
    id: 'snails',
    title: 'Snail Race in the Rain',
    hero: 'my_snail',
    dials: ['wind'],
    concept: 'friction',
    entities: [
      ground(['ground', 'pad'], 'stone'),
      {
        id: 'my_snail',
        tags: ['snail', 'my_snail'],
        x: 1,
        y: 7.7,
        w: 0.8,
        h: 0.6,
        material: 'rubber',
      },
      {
        id: 'rival_snail',
        tags: ['snail', 'rival'],
        x: 1,
        y: 6.9,
        w: 0.8,
        h: 0.6,
        material: 'rubber',
      },
      { id: 'flag', tags: ['flag'], x: 15.2, y: 7.3, w: 0.2, h: 1.4, isStatic: true },
    ],
  }),
  'soft-moon-landing': scene({
    id: 'moon',
    title: 'Soft Moon Landing',
    hero: 'rocket',
    gravity: 1.62,
    dials: ['gravity'],
    concept: 'gravity',
    entities: [
      ground(['ground', 'moon'], 'stone'),
      { id: 'rocket', tags: ['rocket'], x: 8, y: 1, w: 0.8, h: 1.4, material: 'metal' },
      {
        id: 'rock_1',
        tags: ['rock'],
        x: 3,
        y: 7.6,
        w: 1,
        h: 0.8,
        isStatic: true,
        material: 'stone',
      },
      {
        id: 'rock_2',
        tags: ['rock'],
        x: 13,
        y: 7.6,
        w: 1,
        h: 0.8,
        isStatic: true,
        material: 'stone',
      },
    ],
  }),
  'catapult-the-acorns': scene({
    id: 'acorns',
    title: 'Catapult the Acorns at the Cans',
    hero: 'acorn_1',
    dials: ['wind'],
    concept: 'projectile',
    entities: [
      ground(),
      {
        id: 'acorn_1',
        tags: ['acorn'],
        x: 2,
        y: 7.6,
        w: 0.4,
        h: 0.4,
        shape: 'circle',
        material: 'wood',
      },
      {
        id: 'acorn_2',
        tags: ['acorn'],
        x: 1.4,
        y: 7.6,
        w: 0.4,
        h: 0.4,
        shape: 'circle',
        material: 'wood',
      },
      {
        id: 'acorn_3',
        tags: ['acorn'],
        x: 0.8,
        y: 7.6,
        w: 0.4,
        h: 0.4,
        shape: 'circle',
        material: 'wood',
      },
      { id: 'can_1', tags: ['can'], x: 12, y: 7.5, w: 0.6, h: 1, material: 'metal' },
      { id: 'can_2', tags: ['can'], x: 12.7, y: 7.5, w: 0.6, h: 1, material: 'metal' },
      { id: 'can_3', tags: ['can'], x: 12.35, y: 6.5, w: 0.6, h: 1, material: 'metal' },
    ],
  }),
  'keep-the-bubble-alive': scene({
    id: 'bubble',
    title: 'Keep the Bubble Alive',
    hero: 'bubble',
    dials: ['wind'],
    concept: 'airResistance',
    entities: [
      ground(),
      {
        id: 'bubble',
        tags: ['bubble'],
        x: 8,
        y: 4,
        w: 0.8,
        h: 0.8,
        shape: 'circle',
        material: 'soap',
      },
      { id: 'thorn_1', tags: ['thorn'], x: 4, y: 7.6, w: 0.4, h: 0.8, isStatic: true },
      { id: 'thorn_2', tags: ['thorn'], x: 12, y: 7.6, w: 0.4, h: 0.8, isStatic: true },
      {
        id: 'cloud',
        tags: ['cloud'],
        x: 8,
        y: 0.5,
        w: 3,
        h: 0.6,
        isStatic: true,
        material: 'soap',
      },
    ],
  }),
  'marble-run-to-the-cup': scene({
    id: 'marble',
    title: 'Marble Run to the Cup',
    hero: 'marble',
    dials: ['gravity'],
    concept: 'energy',
    entities: [
      ground(),
      {
        id: 'marble',
        tags: ['marble'],
        x: 1.5,
        y: 0.8,
        w: 0.5,
        h: 0.5,
        shape: 'circle',
        material: 'stone',
      },
      { id: 'ramp_1', tags: ['ramp'], x: 3, y: 2.5, w: 4, h: 0.3, isStatic: true, rotation: 0.25 },
      { id: 'ramp_2', tags: ['ramp'], x: 8, y: 4.5, w: 4, h: 0.3, isStatic: true, rotation: 0.25 },
      { id: 'ramp_3', tags: ['ramp'], x: 12, y: 6.3, w: 4, h: 0.3, isStatic: true, rotation: 0.2 },
      { id: 'cup', tags: ['cup'], x: 14.8, y: 7.6, w: 1, h: 0.8, isStatic: true },
    ],
  }),
  'frog-and-owl-chase': scene({
    id: 'chase',
    title: 'Frog and Owl Chase',
    hero: 'frog',
    dials: ['gravity'],
    concept: 'speed',
    entities: [
      ground(),
      { id: 'frog', tags: ['frog'], x: 4, y: 7.5, w: 1, h: 1, shape: 'circle', material: 'rubber' },
      { id: 'owl', tags: ['owl'], x: 13, y: 7.5, w: 1, h: 1, material: 'wood' },
      { id: 'log', tags: ['log'], x: 8, y: 7.6, w: 2, h: 0.8, isStatic: true },
    ],
  }),
} satisfies Record<string, SceneDoc>;
