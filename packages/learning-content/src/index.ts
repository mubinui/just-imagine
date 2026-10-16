import { WorldPackSchema, type WorldPack } from './schema';
import spaceGalaxy from './packs/space-galaxy.json' with { type: 'json' };
import space from './packs/space.json' with { type: 'json' };
import animalsFarm from './packs/animals-farm.json' with { type: 'json' };
import animalsJungle from './packs/animals-jungle.json' with { type: 'json' };
import animalsOcean from './packs/animals-ocean.json' with { type: 'json' };

import body from './packs/body.json' with { type: 'json' };
import food from './packs/food.json' with { type: 'json' };
import hygiene from './packs/hygiene.json' with { type: 'json' };
import exercise from './packs/exercise.json' with { type: 'json' };
export * from './schema';
export { PETS, petById } from './pets';
export { personaInstruction, type PackLanguage } from './characters';

const ALL_PACKS = [
  space,
  animalsFarm,
  animalsJungle,
  animalsOcean,
  spaceGalaxy,
  body,
  food,
  hygiene,
  exercise,
].map((raw) => WorldPackSchema.parse(raw));

export const PACKS: Readonly<Record<string, WorldPack>> = Object.freeze(
  Object.fromEntries(ALL_PACKS.map((pack) => [pack.id, pack])),
);

export const PACK_IDS: readonly string[] = Object.freeze(ALL_PACKS.map((pack) => pack.id));

// Returns a deep copy so callers cannot mutate the shared authored content.
export function loadPack(id: string): WorldPack {
  const pack = Object.hasOwn(PACKS, id) ? PACKS[id] : undefined;
  if (!pack) throw new Error(`unknown world pack "${id}"`);
  return structuredClone(pack);
}

export { PLAY_COPY } from './play';
export * from './adventures';
