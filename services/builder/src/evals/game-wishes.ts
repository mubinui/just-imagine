import type { Concept } from '@just-imagine/scene-schema';
import type { BuildWorldJob } from '@just-imagine/protocol';

/**
 * Game-or-playground eval wishes (quality programme E4). Each row names the
 * kind the builder should choose. The offline test checks the `wantsGame`
 * heuristic against every row; a Vertex run can reuse the rows to measure the
 * script model's first-try pass rate.
 */
export interface GameWish {
  id: string;
  description: string;
  kind: 'game' | 'playground';
  concepts: Concept[];
  ageBand: BuildWorldJob['ageBand'];
}

type Row = [string, GameWish['kind'], Concept[], GameWish['ageBand']];
const rows: Row[] = [
  ['A frog that must catch ten flies before the owl wakes up', 'game', ['force'], '6-7'],
  ['Stack blocks higher than the giraffe while the wind grows', 'game', ['balance'], '8-10'],
  [
    'Race the snail across the pond where rain makes the lily pads slippery',
    'game',
    ['friction'],
    '8-10',
  ],
  ['Land the rocket softly on the Moon or it bounces away', 'game', ['gravity'], '8-10'],
  ['Catapult acorns to knock down all the cans', 'game', ['force'], '6-7'],
  ['Keep the bubble in the air for as long as you can', 'game', ['gravity'], '6-7'],
  ['A marble run game where the marble has to reach the cup', 'game', ['gravity'], '8-10'],
  ['Help the bunny dodge the falling pinecones', 'game', ['gravity'], '6-7'],
  ['Collect all the stars before the timer runs out', 'game', ['force'], '6-7'],
  ['A penguin sliding race on the ice', 'game', ['friction'], '8-10'],
  ['How many apples can the hedgehog catch in a basket?', 'game', ['gravity'], '6-7'],
  ['Bounce the ball into the hoop to score points', 'game', ['bounce'], '8-10'],
  ['A puppy chase where I win if the puppy reaches the bone first', 'game', ['speed'], '6-7'],
  ['Make a game where the boat must not sink when I add treasure', 'game', ['buoyancy'], '8-10'],
  ['Pop all the balloons with three lives', 'game', ['force'], '6-7'],
  ['Level one: push the box onto the button, level two has ice', 'game', ['friction'], '11-13'],
  ['Keep the kite up in the storm for twenty seconds', 'game', ['airResistance'], '8-10'],
  [
    'Throw the rubber ball so it bounces into the bucket, beat my best score',
    'game',
    ['bounce'],
    '11-13',
  ],
  ['Catch the raindrops in a cup before they hit the ground', 'game', ['gravity'], '6-7'],
  ['A bowling game with wooden pins and a stone ball', 'game', ['momentum'], '8-10'],
  ['Guide the duckling home and avoid the splashing fish', 'game', ['buoyancy'], '6-7'],
  ['A jelly dragon bouncing gently on a cloud', 'playground', ['bounce'], '6-7'],
  ['A rubber ball bouncing on the Moon', 'playground', ['gravity', 'bounce'], '8-10'],
  ['Which little boats float in a pond?', 'playground', ['buoyancy'], '6-7'],
  [
    'A feather and a stone falling where there is no air',
    'playground',
    ['gravity', 'airResistance'],
    '11-13',
  ],
  [
    'A springy mushroom that helps a friendly snail hop',
    'playground',
    ['springiness', 'bounce'],
    '8-10',
  ],
  ['A windy beach where kites and leaves blow around', 'playground', ['airResistance'], '6-7'],
  ['Two soft toy carts bump into each other', 'playground', ['momentum'], '11-13'],
  ['An astronaut teddy jumping on Jupiter', 'playground', ['gravity'], '6-7'],
  ['A slide made of ice and a slide made of carpet', 'playground', ['friction'], '8-10'],
];

export const GAME_WISHES: readonly GameWish[] = rows.map(
  ([description, kind, concepts, ageBand], index) => ({
    id: `game_wish_${String(index + 1).padStart(2, '0')}`,
    description,
    kind,
    concepts,
    ageBand,
  }),
);
