/**
 * Painted stand-ins: transparent sprites shipped with the web app and used when a hero's or
 * character's generated art does not arrive. Files live in apps/web/public/standins/
 * (see PROVENANCE.md there); width and height are the real pixel sizes of each WebP.
 */
export interface StandIn {
  key: string;
  url: string;
  width: number;
  height: number;
  words: readonly string[];
}

const standIn = (key: string, width: number, height: number, words: readonly string[]) => ({
  key,
  url: `/standins/${key}.webp`,
  width,
  height,
  words,
});

export const STANDINS: readonly StandIn[] = [
  standIn('car', 512, 372, ['car', 'cart', 'kart', 'racer', 'vehicle']),
  standIn('truck', 512, 333, ['truck', 'lorry', 'bus', 'van', 'tractor']),
  standIn('ball', 511, 512, ['ball', 'marble', 'orb']),
  standIn('rocket', 512, 320, ['rocket', 'spaceship', 'ship in space', 'shuttle']),
  standIn('boat', 505, 512, ['boat', 'ship', 'raft', 'canoe', 'submarine']),
  standIn('robot', 405, 512, ['robot', 'droid', 'machine']),
  standIn('dog', 512, 444, ['dog', 'puppy']),
  standIn('cat', 512, 469, ['cat', 'kitten']),
  standIn('bird', 512, 463, ['bird', 'chick', 'duck', 'owl', 'parrot']),
  standIn('fish', 512, 442, ['fish', 'shark', 'whale', 'dolphin']),
  standIn('child', 163, 512, ['child', 'kid', 'boy', 'girl', 'person', 'friend']),
  // The generic default when an entity's words match nothing else.
  standIn('crate', 511, 512, ['box', 'block', 'crate', 'cube']),
];

/** Each friend's own relaxed-smile frame, cut from the friends acting sheet. */
export const FRIEND_STANDINS: Record<'mishti' | 'bhombol' | 'chandni', StandIn> = {
  mishti: standIn('friend-mishti', 167, 217, ['mishti']),
  bhombol: standIn('friend-bhombol', 193, 219, ['bhombol']),
  chandni: standIn('friend-chandni', 164, 216, ['chandni']),
};

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/**
 * The stand-in for an entity whose art did not arrive. A friend gets its own companion's frame;
 * anything else gets the entry with the most matching whole words in its name, tags and
 * description (ties go to the earlier entry), else the generic crate.
 */
export function standInFor(
  entity: { name?: string; tags: readonly string[]; description?: string },
  companionId?: string,
): StandIn {
  if (entity.tags.includes('friend')) {
    const own = Object.keys(FRIEND_STANDINS).find((id) => entity.tags.includes(id)) ?? companionId;
    if (own && own in FRIEND_STANDINS) return FRIEND_STANDINS[own as keyof typeof FRIEND_STANDINS];
  }
  const present = new Set([
    ...words(entity.name ?? ''),
    ...entity.tags.flatMap(words),
    ...words(entity.description ?? ''),
  ]);
  let best = STANDINS.find((s) => s.key === 'crate')!;
  let bestScore = 0;
  for (const candidate of STANDINS) {
    const score = candidate.words.filter((phrase) =>
      words(phrase).every((w) => present.has(w)),
    ).length;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
