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
  standIn('dog', 512, 444, ['dog', 'puppy', 'wolf', 'fox']),
  standIn('cat', 512, 469, ['cat', 'kitten', 'lion', 'tiger', 'leopard']),
  standIn('bird', 512, 463, ['bird', 'chick', 'duck', 'owl', 'parrot', 'hen', 'penguin']),
  standIn('fish', 512, 442, ['fish', 'shark', 'whale', 'dolphin']),
  standIn('child', 163, 512, ['child', 'kid', 'boy', 'girl', 'person', 'friend']),
  // The generic default when an entity's words match nothing else.
  standIn('crate', 511, 512, ['box', 'block', 'crate', 'cube']),
];

export type CompanionKey = 'mishti' | 'bhombol' | 'chandni';

/** Each friend's own relaxed-smile frame, cut from the friends acting sheet. */
export const FRIEND_STANDINS: Record<CompanionKey, StandIn> = {
  mishti: standIn('friend-mishti', 167, 217, ['mishti']),
  bhombol: standIn('friend-bhombol', 193, 219, ['bhombol']),
  chandni: standIn('friend-chandni', 164, 216, ['chandni']),
};

const COMPANIONS = Object.keys(FRIEND_STANDINS) as CompanionKey[];
const isCompanion = (value: string | undefined): value is CompanionKey =>
  COMPANIONS.includes(value as CompanionKey);

/**
 * Which companion an entity is, when it is the child's friend: its id is `<companion>` or
 * `<companion>_N`, or it carries a companion's tag, or it carries the `friend` tag (then the
 * build's own `companionId` names it). Undefined for anything else.
 */
export function isFriendEntity(
  entity: { id?: string; tags: readonly string[] },
  companionId?: string,
): CompanionKey | undefined {
  const byId = entity.id?.match(/^([a-z]+)(?:_\d+)?$/)?.[1];
  if (isCompanion(byId)) return byId;
  const byTag = COMPANIONS.find((id) => entity.tags.includes(id));
  if (byTag) return byTag;
  if (entity.tags.includes('friend') && isCompanion(companionId)) return companionId;
  return undefined;
}

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** A word as written and without a trailing plural `s` or `es`. */
const forms = (word: string) => [
  word,
  ...(word.length > 2 && word.endsWith('s') ? [word.slice(0, -1)] : []),
  ...(word.length > 3 && word.endsWith('es') ? [word.slice(0, -2)] : []),
];

const PHRASES = STANDINS.flatMap((standIn) =>
  standIn.words.map((phrase) => ({ standIn, words: words(phrase) })),
);

/**
 * The entry whose phrase matches earliest in `segments` (each a run of words; a phrase never
 * spans two), the longer phrase winning at the same word, then the earlier entry.
 */
function earliestMatch(segments: string[][]): StandIn | undefined {
  for (const segment of segments) {
    const variants = segment.map(forms);
    for (let at = 0; at < segment.length; at++) {
      let best: (typeof PHRASES)[number] | undefined;
      for (const phrase of PHRASES) {
        const fits = phrase.words.every((w, k) => variants[at + k]?.includes(w));
        if (fits && phrase.words.length > (best?.words.length ?? 0)) best = phrase;
      }
      if (best) return best.standIn;
    }
  }
  return undefined;
}

/**
 * The stand-in for an entity whose art did not arrive. A friend gets its own companion's frame.
 * Anything else is decided on its name and tags; its description is read only when they match
 * nothing. The earliest matching word wins (plurals count), else the generic crate.
 */
export function standInFor(
  entity: { id?: string; name?: string; tags: readonly string[]; description?: string },
  companionId?: string,
): StandIn {
  const friend = isFriendEntity(entity, companionId);
  if (friend) return FRIEND_STANDINS[friend];
  return (
    earliestMatch([words(entity.name ?? ''), ...entity.tags.map(words)]) ??
    earliestMatch([words(entity.description ?? '')]) ??
    STANDINS.find((s) => s.key === 'crate')!
  );
}
