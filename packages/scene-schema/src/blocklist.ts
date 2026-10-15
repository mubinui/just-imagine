// Backstop only. Primary content policy lives in the builder and gateway prompts (spec 12).
export const BLOCKED_TERMS = [
  'gun',
  'guns',
  'rifle',
  'pistol',
  'shotgun',
  'knife',
  'knives',
  'dagger',
  'sword',
  'swords',
  'bomb',
  'bombs',
  'grenade',
  'missile',
  'blood',
  'bloody',
  'gore',
  'zombie',
  'zombies',
  'corpse',
  'kill',
  'kills',
  'killing',
  'murder',
  'torture',
  'demon',
  'devil',
  'naked',
  'nude',
  'sexy',
  'drunk',
  'beer',
  'wine',
  'vodka',
  'cigarette',
  'drugs',
  'cocaine',
  'suicide',
] as const;

const pattern = new RegExp(`\\b(${BLOCKED_TERMS.join('|')})\\b`, 'i');

export function findBlockedTerm(text: string): string | null {
  const match = pattern.exec(text);
  return match ? match[1]!.toLowerCase() : null;
}
