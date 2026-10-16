import { findBlockedTerm } from '@just-imagine/scene-schema';
import {
  PETS,
  ADVENTURES,
  storyChapter,
  PACKS,
  type PackChallenge,
  type PackCharacter,
  type WorldPack,
} from '@just-imagine/learning-content';
import { languageOf } from '@just-imagine/protocol';
import type { SessionRecord } from './contracts';

/** A refusal whose message is safe to show the model, so it can correct itself. */
export class ToolRefusal extends Error {}

/**
 * The pets a child gains when their total reaches `total`: every pet whose threshold is now met,
 * plus the challenge's own reward, in collection order and never one they already have.
 */
export function petsUnlocked(owned: readonly string[], total: number, reward?: string): string[] {
  const have = new Set(owned);
  return PETS.filter(
    (pet) => !have.has(pet.id) && (pet.unlockPoints <= total || pet.id === reward),
  ).map((pet) => pet.id);
}

/** Authored content only: a pack and one of its characters, or an error the model can read. */
export function resolvePersona(
  packId: string,
  characterId: string,
): { pack: WorldPack; character: PackCharacter } {
  const pack = Object.hasOwn(PACKS, packId) ? PACKS[packId] : undefined;
  const character = pack?.characters.find((c) => c.id === characterId);
  if (!pack || !character) throw new Error('Unknown learning character');
  return { pack, character };
}

/** The challenge a persona may ask: it must belong to the character holding the session. */
export function personaChallenge(record: SessionRecord, challengeId: string): PackChallenge {
  if (!record.persona) throw new ToolRefusal('Only a learning character can ask challenges.');
  const { pack } = resolvePersona(record.persona.packId, record.persona.characterId);
  const challenge = pack.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.characterId !== record.persona.characterId)
    throw new ToolRefusal('That challenge is not one of yours.');
  return challenge;
}

export function personaName(record: SessionRecord, character: PackCharacter): string {
  return languageOf(record.identity.child) === 'bn' ? character.nameBn : character.name;
}

/** A compact directory of callable characters for the friend's summon_pack_character tool. */
export const PACK_DIRECTORY = Object.values(PACKS)
  .map((pack) => `${pack.id}: ${pack.characters.map((c) => c.id).join(', ')}`)
  .join('; ');

/** The shared art backstop treats blood as gore. Authored body lessons need the biological term;
 * the primary model still classifies the ORIGINAL text, and every other blocked term stays blocked. */
export function blockedLearningInput(
  record: Pick<SessionRecord, 'persona'>,
  text: string,
): string | null {
  const isBody =
    record.persona &&
    resolvePersona(record.persona.packId, record.persona.characterId).pack.section === 'body';
  return findBlockedTerm(isBody ? text.replace(/\bblood\b/gi, 'circulation') : text);
}

/** Only authored story text may reach Live as trusted context. Browser prose is never accepted. */
export function storyPlayContext(
  record: Pick<SessionRecord, 'persona' | 'identity'>,
  message: {
    packId: string;
    characterId: string;
    missionId: string;
    storyPhase?: 'begin' | 'progress' | 'complete';
  },
): string | undefined {
  const persona = record.persona;
  const chapter = storyChapter(message.packId, message.missionId);
  if (
    !persona ||
    !chapter ||
    persona.packId !== message.packId ||
    persona.characterId !== message.characterId ||
    chapter.characterId !== persona.characterId ||
    !message.storyPhase
  )
    return;
  const lang = languageOf(record.identity.child) === 'bn' ? 1 : 0;
  const { character } = resolvePersona(persona.packId, persona.characterId);
  const fact = (lang ? character.factsBn : character.facts)[chapter.fact];
  return `Trusted authored story-game context. Adventure: ${JSON.stringify(ADVENTURES[message.packId]!.title[lang])}. Chapter: ${JSON.stringify(chapter.title[lang])}. Phase: ${message.storyPhase}. Situation: ${JSON.stringify(chapter.setup[lang])}. Child's goal: ${JSON.stringify(chapter.goal[lang])}. Educational idea: ${JSON.stringify(fact)}. ${message.storyPhase === 'complete' ? `The child completed the game. Story consequence: ${JSON.stringify(chapter.ending[lang])}. Celebrate the specific action and explain its meaning briefly.` : 'The child is playing this chapter. Give one brief in-character hint or explanation about this action, then let them play.'} Keep the current character identity. Never claim to see the real child or diagnose them. Do not award points or start a quiz from game completion; quizzes happen only when requested.`;
}
