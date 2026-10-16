import type { SceneDoc } from '@just-imagine/scene-schema';
import type { WorldPack, PackChallenge, PackCharacter } from '../src/schema';

export function minimalScene(): SceneDoc {
  return {
    schemaVersion: 1,
    worldId: 'w_pack_test',
    tier: 'playground',
    title: 'Test Pack World',
    theme: {
      paletteHint: 'deep navy',
      timeOfDay: 'night',
      backdropDescription: 'a dark starry sky',
      backdrop: { url: '', width: 1920, height: 1080, status: 'placeholder' },
    },
    environment: {
      gravity: { x: 0, y: 0 },
      wind: { x: 0, y: 0 },
      medium: 'space',
      bounds: { width: 16, height: 9 },
      seed: 7,
    },
    materials: {
      stone: {
        density: 2.5,
        friction: 0.7,
        restitution: 0.1,
        softness: 0,
        buoyant: false,
        breakable: false,
        pretend: false,
      },
    },
    entities: [
      {
        id: 'rock_one',
        kind: 'sprite',
        name: 'floating rock',
        description: 'a small grey rock floating in space',
        body: {
          shape: 'circle',
          material: 'stone',
          isStatic: false,
          size: { width: 1, height: 1 },
        },
        transform: { x: 8, y: 4.5, rotation: 0 },
        tags: ['rock', 'hero'],
        behaviors: [],
        pretend: false,
      },
    ],
    joints: [],
    rules: [
      {
        id: 'r_tap_rock',
        when: { event: 'tap', target: 'rock' },
        then: [{ action: 'say', text: 'Rocks float when nothing pulls them down.' }],
        concept: 'gravity',
        once: false,
      },
    ],
    learning: {
      concepts: ['gravity'],
      prediction: {
        question: 'Will the rock fall?',
        options: ['yes', 'no'],
        correctIndex: 1,
        concept: 'gravity',
      },
      dials: [],
      heroEntityId: 'rock_one',
    },
    narration: { intro: 'A rock floats in the dark.' },
  };
}

export function minimalCharacter(overrides: Partial<PackCharacter> = {}): PackCharacter {
  return {
    id: 'rocky',
    name: 'Rocky',
    nameBn: 'রকি',
    look: 'a round grey rock with big friendly eyes',
    voice: 'Puck',
    personality: 'Rocky is calm and slow. Rocky loves to float and hum.',
    facts: [
      'Rocks in space float because nothing pulls them down.',
      'A rock has no air around it in space.',
      'Space is very cold far from the Sun.',
      'Rocks that fall to Earth are called meteorites.',
      'Most space rocks are smaller than a house.',
      'Some space rocks are older than the Earth.',
    ],
    factsBn: [
      'মহাকাশে পাথর ভাসে কারণ কিছুই তাকে টানে না।',
      'মহাকাশে পাথরের চারপাশে বাতাস নেই।',
      'সূর্য থেকে দূরে মহাকাশ খুব ঠান্ডা।',
      'যে পাথর পৃথিবীতে পড়ে তাকে উল্কাপিণ্ড বলে।',
      'বেশিরভাগ মহাকাশ পাথর একটি বাড়ির চেয়ে ছোট।',
      'কিছু মহাকাশ পাথর পৃথিবীর চেয়েও পুরোনো।',
    ],
    catchphrase: 'Float on!',
    catchphraseBn: 'ভেসে চলো!',
    funnyAngle: 'Rocky thinks everything is a little too fast.',
    ...overrides,
  };
}

export function minimalChallenge(overrides: Partial<PackChallenge> = {}): PackChallenge {
  return {
    id: 'ch_float',
    characterId: 'rocky',
    question: 'What is a rock that falls to Earth called?',
    questionBn: 'পৃথিবীতে পড়া পাথরকে কী বলে?',
    answerKey: 'meteorite',
    accepted: ['meteorite', 'a meteorite', 'meteorites', 'meteor', 'উল্কাপিণ্ড', 'উল্কা'],
    hint: 'It starts with the word meteor.',
    hintBn: 'শব্দটি উল্কা দিয়ে শুরু হয়।',
    points: 3,
    ...overrides,
  };
}

export function minimalPack(overrides: Partial<WorldPack> = {}): WorldPack {
  return {
    id: 'test_pack',
    section: 'space',
    title: 'Test Pack',
    titleBn: 'টেস্ট প্যাক',
    scene: minimalScene(),
    characters: [minimalCharacter()],
    hotspots: [{ entityId: 'rock_one', characterId: 'rocky', comesCloser: 'swoop' }],
    sounds: [
      {
        entityId: 'rock_one',
        file: 'assets/sounds/rock.ogg',
        provenance: {
          source: 'Wikimedia Commons',
          licence: 'CC0 1.0',
          url: 'https://commons.wikimedia.org/wiki/File:Rock.ogg',
        },
      },
    ],
    challenges: [minimalChallenge()],
    ...overrides,
  };
}
