import type { Concept } from '@just-imagine/scene-schema';

export interface ConceptCardCopy {
  title: string; // on the Discovery Card
  realLifeNote: string; // fixed, curated
  kidHint: string; // given to the model as the fact it must stay true to
}

export const CONCEPT_BANK: Record<Concept, ConceptCardCopy> = {
  gravity: {
    title: 'Gravity pulls down',
    realLifeNote:
      'Earth pulls everything toward the ground. That is why a dropped toy falls instead of floating away.',
    kidHint: 'Everything falls because the Earth pulls it down.',
  },
  mass: {
    title: 'Heavy and light',
    realLifeNote:
      'A full backpack is harder to lift than an empty one because it has more stuff inside, more mass.',
    kidHint: 'Mass is how much stuff is in a thing.',
  },
  buoyancy: {
    title: 'Float or sink',
    realLifeNote:
      'A rubber duck floats in the bath because the water pushes it up. Once it rests, that push balances its weight.',
    kidHint: 'Water pushes up on things. An object floats when that push can balance its weight.',
  },
  friction: {
    title: 'Rough and slippery',
    realLifeNote:
      'Socks slide on a wooden floor but grip a carpet. Rough surfaces slow things down more.',
    kidHint: 'Rough surfaces slow sliding things down.',
  },
  bounce: {
    title: 'Boing!',
    realLifeNote:
      'A rubber ball squashes when it hits the floor and springs back, so it bounces. Clay just squashes and stays.',
    kidHint: 'Springy things squash and spring back.',
  },
  momentum: {
    title: 'Hard to stop',
    realLifeNote:
      'A fast, heavy shopping trolley is hard to stop. The faster and heavier, the more it keeps going.',
    kidHint: 'Fast and heavy things are hard to stop.',
  },
  airResistance: {
    title: 'Air pushes back',
    realLifeNote:
      'A feather drifts down slowly because the air pushes against it. A stone cuts through the air.',
    kidHint: 'Air slows down light, wide things.',
  },
  balance: {
    title: 'Balanced',
    realLifeNote:
      'A seesaw balances when the turning effects on both sides match. A heavier friend can balance by sitting closer to the middle.',
    kidHint: 'A seesaw balances when weight and distance make both sides turn equally.',
  },
  springiness: {
    title: 'Springy',
    realLifeNote:
      'A trampoline stretches when you land and pushes you back up. Jelly wobbles for the same reason.',
    kidHint: 'Springy things stretch and then push back.',
  },
  density: {
    title: 'Packed tight',
    realLifeNote:
      'A stone and a sponge can be the same size, but the stone is packed tighter, so it is heavier and sinks.',
    kidHint: 'Density is how tightly stuff is packed.',
  },
  force: {
    title: 'Push and pull',
    realLifeNote: 'Every push and pull is a force. A bigger push makes a toy car go faster.',
    kidHint: 'A force is a push or a pull.',
  },
  speed: {
    title: 'Fast and slow',
    realLifeNote:
      'Speed tells you how far something moves each second. A faster bike covers the same path in less time.',
    kidHint: 'Speed is how far something moves each second.',
  },
  acceleration: {
    title: 'Speeding up',
    realLifeNote:
      'A bike rolling down a hill goes faster and faster. Speeding up or slowing down is acceleration.',
    kidHint: 'Acceleration means changing speed or direction.',
  },
  energy: {
    title: 'Stored energy',
    realLifeNote:
      'A ball held high has stored energy. Let go and it turns into moving energy as it falls.',
    kidHint: 'Energy can be stored and then turned into motion.',
  },
  projectile: {
    title: 'The arc',
    realLifeNote:
      'A thrown ball curves as gravity pulls it down. With no air drag, forty-five degrees goes furthest when it lands at its starting height.',
    kidHint: 'A thrown thing curves because gravity pulls it down while it moves forward.',
  },
  probability: {
    title: 'Likely or not',
    realLifeNote:
      'Drop many balls through pegs and most land in the middle bins. Some outcomes are just more likely.',
    kidHint: 'Some outcomes happen more often than others.',
  },
  fraction: {
    title: 'Parts of a whole',
    realLifeNote:
      'Cut a pizza into four equal slices and each slice is one quarter. Two slices make a half.',
    kidHint: 'A fraction is equal parts of a whole.',
  },
  graph: {
    title: 'The picture of numbers',
    realLifeNote:
      'A graph draws how something changes. A height graph of a jump goes up, then comes back down.',
    kidHint: 'A graph shows how a number changes over time.',
  },
  measurement: {
    title: 'Measure it',
    realLifeNote:
      'A ruler tells you how far and a stopwatch tells you how long. Measuring turns a guess into a number.',
    kidHint: 'Measuring gives you a number you can compare.',
  },
};

export function conceptCard(concept: Concept): { title: string; realLifeNote: string } {
  const { title, realLifeNote } = CONCEPT_BANK[concept];
  return { title, realLifeNote };
}
