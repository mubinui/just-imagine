import type { SceneDoc } from '@just-imagine/scene-schema';

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
 * Tap toy: a tapped body hops with a boing, a dragged one follows the finger,
 * hard bumps pop, and the first tap is greeted. In `game` mode every tenth tap
 * on a body other than the hero scores and celebrates; when only the hero can
 * move, taps on the hero count. Whenever nothing in the scene can move (from
 * the start, or after a scene rule removed every moving body), one movable
 * copy of a sprite is dropped in so there is always something to play with.
 */
export function tapToySource(doc: SceneDoc, language: Language, mode: 'game' | 'freeplay'): string {
  const hero = doc.learning.heroEntityId;
  const sprites = doc.entities.filter((e) => e.kind === 'sprite');
  const moving = sprites.filter((e) => !e.body.isStatic);
  const othersMove = moving.some((e) => e.id !== hero);
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
    moving.find((e) => e.id !== hero) ??
    moving[0] ??
    sprites.find((e) => e.id !== hero) ??
    sprites[0];
  const strings = TAP_TOY_STRINGS[language];
  const lines = [
    '// Template toy: tap anything and see what happens.',
    `const HERO = ${JSON.stringify(hero)};`,
    `const COUNT_HERO = ${!othersMove && heroMoves};`,
    `const GREETING = ${JSON.stringify(strings.greeting)};`,
    'let greeted = false;',
    'let now = 0;',
    'let lastPop = -1;',
  ];
  if (toy) {
    const x = Math.min(14.5, Math.max(1.5, toy.transform.x + 1.2));
    const y = Math.min(7.5, Math.max(0.8, toy.transform.y - 1));
    lines.push(
      `const MOVERS = ${JSON.stringify(movers)};`,
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
      'let points = 0;',
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
    '  if (!e.target) return;',
    '  game.impulse(e.target.id, { x: 0, y: -4 });',
    "  game.sound('boing');",
  );
  if (mode === 'game') {
    lines.push(
      '  if (e.target.id === HERO && !COUNT_HERO) return;',
      '  taps += 1;',
      '  if (taps % 10 !== 0) return;',
      '  points += 1;',
      '  game.score(1);',
      "  game.celebrate('confetti');",
      '  game.hud({ score: points, label: LABEL });',
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
