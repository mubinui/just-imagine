import { z } from 'zod';
import { AgeBandSchema, type AgeBand } from './bands';

export const CompanionIdSchema = z.enum(['mishti', 'bhombol', 'chandni']);
export const GuideIdSchema = z.enum(['pori', 'onkomama', 'jadukaka']);
export const CharacterIdSchema = z.enum([...CompanionIdSchema.options, ...GuideIdSchema.options]);
export type CharacterId = z.infer<typeof CharacterIdSchema>;

export const EmotionSchema = z.enum(['idle', 'happy', 'thinking', 'surprised', 'sleepy']);
export type Emotion = z.infer<typeof EmotionSchema>;

export const SpellSchema = z.enum([
  'reverseGravity',
  'slowTime',
  'grow',
  'shrink',
  'floatAll',
  'restore',
]);
export type Spell = z.infer<typeof SpellSchema>;

export interface CharacterConfig {
  id: CharacterId;
  kind: 'companion' | 'guide';
  displayName: string;
  title: string; // shown to parents and in the Gallery
  look: string; // one-sentence art direction for the Rive character
  domain: 'play' | 'physics' | 'maths' | 'magic';
  leads: Array<'imagine' | 'predict' | 'play' | 'discover' | 'remix' | 'recap' | 'lab' | 'spell'>;
  bands: AgeBand[];
  catchphrase: string;
  // Live API voice name. Set after the week-2 listening test; the gateway reads it from here.
  voice: string;
}

const ALL_BANDS = AgeBandSchema.options;

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  mishti: {
    id: 'mishti',
    kind: 'companion',
    displayName: 'Mishti',
    title: 'the dreamer',
    look: 'tiny cream kitten with huge sparkly eyes and a pink bow',
    domain: 'play',
    leads: ['imagine', 'remix'],
    bands: ['6-7', '8-10'],
    catchphrase: 'Ooh, what if...',
    voice: 'Leda',
  },
  bhombol: {
    id: 'bhombol',
    kind: 'companion',
    displayName: 'Bhombol',
    title: 'the tinkerer',
    look: 'chubby golden puppy with a tool belt and floppy ears',
    domain: 'play',
    leads: ['play', 'discover'],
    bands: ['6-7', '8-10'],
    catchphrase: 'Let us build it!',
    voice: 'Puck',
  },
  chandni: {
    id: 'chandni',
    kind: 'companion',
    displayName: 'Chandni',
    title: 'the thinker',
    look: 'sleek silver-grey cat with a crescent-moon pendant',
    domain: 'play',
    leads: ['predict', 'recap'],
    bands: ['6-7', '8-10'],
    catchphrase: 'What do you think will happen?',
    voice: 'Kore',
  },
  pori: {
    id: 'pori',
    kind: 'guide',
    displayName: 'Pori Apu',
    title: 'Physics Fairy',
    look: 'small glowing fairy with dragonfly wings and a star-tipped wand',
    domain: 'physics',
    leads: ['lab', 'discover'],
    bands: [...ALL_BANDS],
    catchphrase: 'Every push has a story!',
    voice: 'Aoede',
  },
  onkomama: {
    id: 'onkomama',
    kind: 'guide',
    displayName: 'Onko Mama',
    title: 'Math Man',
    look: 'cheerful caped uncle with round glasses, chalk in hand and a calculator belt',
    domain: 'maths',
    leads: ['lab', 'discover'],
    bands: ['8-10', '11-13'],
    catchphrase: 'Numbers are everywhere, let us find them!',
    voice: 'Charon',
  },
  jadukaka: {
    id: 'jadukaka',
    kind: 'guide',
    displayName: 'Jadu Kaka',
    title: 'Magic Man',
    look: 'tall magician in a top hat with a twirly moustache and a sparkly cloak',
    domain: 'magic',
    leads: ['spell', 'discover'],
    bands: [...ALL_BANDS],
    catchphrase: 'Abracadabra, but with science!',
    voice: 'Fenrir',
  },
};

export const DEFAULT_CHARACTER: CharacterId = 'bhombol';

export function guidesFor(band: AgeBand): CharacterConfig[] {
  return Object.values(CHARACTERS).filter((c) => c.kind === 'guide' && c.bands.includes(band));
}
