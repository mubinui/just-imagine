import type { Entity, SceneDoc } from '@just-imagine/scene-schema';

type Language = 'en' | 'bn';

/** The things a child can catch: every moving sprite that is not the hero. */
export function collectTargets(doc: SceneDoc): Entity[] {
  return doc.entities.filter(
    (e) => e.kind === 'sprite' && !e.body.isStatic && e.id !== doc.learning.heroEntityId,
  );
}

export const COLLECT_STRINGS = {
  en: {
    things: 'things',
    label: (name: string) => `Catch 5 ${name}!`,
    greeting: (name: string) => `Tap where I should go, or tap a ${name}!`,
    win: 'You caught them all! Keep playing!',
  },
  bn: {
    things: 'জিনিস',
    label: (name: string) => `৫টা ${name} ধরো!`,
    greeting: (name: string) => `কোথায় যাব ট্যাপ করো, বা একটা ${name} ট্যাপ করো!`,
    win: 'সব ধরে ফেলেছ! খেলতে থাকো!',
  },
} as const;

/** The most common display name among the targets, lowercased; undefined when none is most common. */
export function targetName(targets: readonly Entity[]): string | undefined {
  const counts = new Map<string, number>();
  for (const e of targets) {
    const name = e.name.trim().toLowerCase();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  return first && (!second || first[1] > second[1]) ? first[0] : undefined;
}

/** "fly" to "flies", "box" to "boxes", "metal bolt" to "metal bolts". */
export function pluralEn(name: string): string {
  if (/(?:s|x|z|ch|sh)$/.test(name)) return `${name}es`;
  if (/[^aeiou]y$/.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

/**
 * Collect: tapping empty stage hops the hero toward the tap; tapping a target,
 * or the hero touching one, catches it with a pop and a sparkle. Five catches
 * celebrate without ending the game, and targets keep coming back.
 */
export function collectSource(doc: SceneDoc, language: Language): string {
  const targets = collectTargets(doc);
  const template = targets[0];
  if (!template) throw new Error('The collect template needs a moving body other than the hero');
  const strings = COLLECT_STRINGS[language];
  const name = targetName(targets);
  const greeting = strings.greeting(name ?? strings.things);
  const label = strings.label(
    name === undefined ? strings.things : language === 'en' ? pluralEn(name) : name,
  );
  const floaty = doc.environment.gravity.y < 1;
  const respawnY = Math.min(7.5, Math.max(0.8, template.transform.y));
  return `// Template game: catch the targets with the hero.
const HERO = ${JSON.stringify(doc.learning.heroEntityId)};
const TEMPLATE = ${JSON.stringify(template.id)};
const MAX = ${targets.length};
const GOAL = 5;
const FLOATY = ${floaty};
const LABEL = ${JSON.stringify(label)};
const WIN = ${JSON.stringify(strings.win)};
const alive = ${JSON.stringify(targets.map((t) => t.id))};
let caught = 0;

game.hud({ score: 0, label: LABEL });
game.say(${JSON.stringify(greeting)});

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

function hopToward(x, y) {
  const heroes = game.find(HERO);
  if (heroes.length === 0) return;
  const hero = heroes[0];
  if (FLOATY) {
    game.impulse(HERO, { x: clamp(x - hero.x, 4), y: clamp(y - hero.y, 4) });
  } else {
    game.impulse(HERO, { x: clamp((x - hero.x) * 1.2, 5), y: -3 });
  }
  game.sound('whoosh');
}

function catchTarget(id) {
  const at = alive.indexOf(id);
  if (at < 0) return;
  alive.splice(at, 1);
  game.remove(id);
  caught += 1;
  game.sound('pop');
  game.celebrate('sparkle');
  game.score(1);
  game.hud({ score: caught, label: LABEL });
  if (caught === GOAL) {
    game.celebrate('confetti');
    game.say(WIN);
  }
}

game.on('tap', (e) => {
  if (e.target && alive.includes(e.target.id)) {
    catchTarget(e.target.id);
    return;
  }
  hopToward(e.x, e.y);
});

game.on('collision', (e) => {
  if (e.a.id === HERO) catchTarget(e.b.id);
  else if (e.b.id === HERO) catchTarget(e.a.id);
});

game.every(2, () => {
  // A scene rule may have removed a target; forget it so a new one can come.
  for (let i = alive.length - 1; i >= 0; i--) {
    if (game.find(alive[i]).length === 0) alive.splice(i, 1);
  }
  if (alive.length >= MAX) return;
  const id = game.spawn(TEMPLATE, { x: 1.5 + game.random() * 13, y: ${respawnY} });
  if (id) alive.push(id);
});
`;
}
