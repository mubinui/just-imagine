import type { SceneDoc } from '@just-imagine/scene-schema';
import { isFriendEntity } from '../standins';

type Language = 'en' | 'bn';

export const TAP_TOY_STRINGS = {
  en: {
    greeting: 'Tap anything and see what happens!',
    label: 'Tap 10 things!',
    win: 'Ten taps! Hooray!',
  },
  bn: {
    greeting: 'যেকোনো কিছুতে ট্যাপ করে দেখো কী হয়!',
    label: '১০টা জিনিসে ট্যাপ করো!',
    win: 'দশটা ট্যাপ! হুররে!',
  },
} as const;

/**
 * Tap toy: a tapped body hops with a boing, a tap on empty stage nudges the
 * nearest movable body toward the finger with a boing and a sparkle, a dragged
 * body follows the finger, hard bumps pop, and the first tap is greeted. In `game` mode the HUD
 * counts every tap on a body other than the hero and the friend, and every tenth scores and celebrates; when only the hero can
 * move, taps on the hero count (the friend too, when it is the hero). The friend is never the copy. Whenever nothing in the scene can move (from
 * the start, or after a scene rule removed every moving body), one movable
 * copy of a sprite is dropped in so there is always something to play with.
 */
export function tapToySource(doc: SceneDoc, language: Language, mode: 'game' | 'freeplay'): string {
  const hero = doc.learning.heroEntityId;
  const sprites = doc.entities.filter((e) => e.kind === 'sprite');
  const moving = sprites.filter((e) => !e.body.isStatic);
  // The child's friend (any shape of it) is never copied as the drop-in toy.
  const friendly = sprites
    .filter((e) => e.tags.includes('friend') || isFriendEntity(e))
    .map((e) => e.id);
  // The friend hops when tapped but never counts toward the ten, unless it is the hero.
  const friends = friendly.filter((id) => id !== hero);
  const othersMove = moving.some((e) => e.id !== hero && !friends.includes(e.id));
  const heroMoves = moving.some((e) => e.id === hero);
  // Tags only moving sprites carry: copies a scene rule spawns still count as something to play with.
  const fixedTags = new Set(doc.entities.filter((e) => !moving.includes(e)).flatMap((e) => e.tags));
  const movers = [
    ...new Set([
      ...moving.map((e) => e.id),
      ...moving.flatMap((e) => e.tags).filter((t) => !fixedTags.has(t)),
    ]),
  ];
  const toy =
    moving.find((e) => e.id !== hero && !friendly.includes(e.id)) ??
    moving.find((e) => !friendly.includes(e.id)) ??
    sprites.find((e) => e.id !== hero && !friendly.includes(e.id)) ??
    sprites.find((e) => !friendly.includes(e.id));
  const strings = TAP_TOY_STRINGS[language];
  const lines = [
    '// Template toy: tap anything and see what happens.',
    `const HERO = ${JSON.stringify(hero)};`,
    `const FRIENDS = ${JSON.stringify(friends)};`,
    `const COUNT_HERO = ${!othersMove && heroMoves};`,
    `const GREETING = ${JSON.stringify(strings.greeting)};`,
    'let greeted = false;',
    'let now = 0;',
    'let lastPop = -1;',
    `const MOVERS = ${JSON.stringify(movers)};`,
    '',
    'function clamp(value, limit) {',
    '  return Math.max(-limit, Math.min(limit, value));',
    '}',
    '',
    '// An empty-stage tap nudges the nearest body that can move toward the finger.',
    'function nudgeToward(x, y) {',
    '  let nearest = null;',
    '  let best = Infinity;',
    "  const groups = [game.find('toy')];",
    '  for (const id of MOVERS) groups.push(game.find(id));',
    '  for (const group of groups) {',
    '    for (const body of group) {',
    '      const d = (body.x - x) * (body.x - x) + (body.y - y) * (body.y - y);',
    '      if (d < best) {',
    '        best = d;',
    '        nearest = body;',
    '      }',
    '    }',
    '  }',
    '  if (nearest) game.impulse(nearest.id, { x: clamp(x - nearest.x, 3), y: clamp(y - nearest.y, 3) });',
    "  game.sound('boing');",
    "  game.celebrate('sparkle');",
    '}',
  ];
  if (toy) {
    const x = Math.min(14.5, Math.max(1.5, toy.transform.x + 1.2));
    const y = Math.min(7.5, Math.max(0.8, toy.transform.y - 1));
    lines.push(
      '',
      'function keepSomethingToPlayWith() {',
      "  if (game.find('toy').length > 0) return;",
      '  for (const id of MOVERS) if (game.find(id).length > 0) return;',
      `  game.spawn(${JSON.stringify(toy.id)}, { x: ${x}, y: ${y}, tags: ['toy'] });`,
      '}',
      'keepSomethingToPlayWith();',
      'game.every(1, keepSomethingToPlayWith);',
    );
  }
  if (mode === 'game') {
    lines.push(
      `const LABEL = ${JSON.stringify(strings.label)};`,
      `const WIN = ${JSON.stringify(strings.win)};`,
      'let taps = 0;',
      'game.hud({ score: 0, label: LABEL });',
    );
  }
  lines.push(
    '',
    "game.on('tick', (e) => {",
    '  now = e.time;',
    '});',
    '',
    "game.on('tap', (e) => {",
    '  if (!greeted) {',
    '    greeted = true;',
    '    game.say(GREETING);',
    '  }',
    '  if (!e.target) {',
    '    nudgeToward(e.x, e.y);',
    '    return;',
    '  }',
    '  game.impulse(e.target.id, { x: 0, y: -4 });',
    "  game.sound('boing');",
  );
  if (mode === 'game') {
    lines.push(
      '  if (FRIENDS.includes(e.target.id)) return;',
      '  if (e.target.id === HERO && !COUNT_HERO) return;',
      '  taps += 1;',
      '  // Every counted tap shows on the HUD, so progress toward ten is never stuck at 0.',
      '  game.hud({ score: taps, label: LABEL });',
      '  if (taps % 10 !== 0) return;',
      '  game.score(1);',
      "  game.celebrate('confetti');",
      '  game.say(WIN);',
    );
  }
  lines.push(
    '});',
    '',
    "game.on('drag', (e) => {",
    '  game.move(e.target.id, { x: e.x, y: e.y });',
    '});',
    '',
    "game.on('collision', (e) => {",
    '  if (e.impulse <= 2 || now - lastPop < 0.2) return;',
    '  lastPop = now;',
    "  game.sound('pop');",
    '});',
    '',
  );
  return lines.join('\n');
}
