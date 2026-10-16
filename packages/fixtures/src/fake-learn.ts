import {
  PACKS,
  PETS,
  normaliseAnswer,
  type PackChallenge,
  type WorldPack,
} from '@just-imagine/learning-content';
import type { ServerMessage } from '@just-imagine/protocol';

/**
 * Learning Worlds in the local preview (spec 6b). A scripted stand-in for a pack character: it
 * introduces itself, asks its first challenge with two tappable options (the preview has no
 * microphone), judges the tapped or typed answer against the authored key, pays points once per
 * challenge, unlocks pets at their thresholds and hands back to the friend on hang-up.
 * The answer key stays here, in the Node process; the browser only ever sees the question.
 */
export interface FakeLearnOptions {
  /** Points the preview explorer has already earned before this session. */
  startingPoints: number;
  quizDelayMs: number;
}

interface Profile {
  points: number;
  pets: string[];
  awarded: Set<string>;
}

type Send = (message: ServerMessage) => void;
type Schedule = (callback: () => void, afterMs: number) => void;

const title = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Two options in a stable order: the authored answer and another answer from the same pack. */
export function previewOptions(pack: WorldPack, challenge: PackChallenge): string[] {
  const answer = title(challenge.answerKey);
  const other =
    pack.challenges.find(
      (c) => normaliseAnswer(c.answerKey) !== normaliseAnswer(challenge.answerKey),
    )?.answerKey ?? (normaliseAnswer(challenge.answerKey) === 'sink' ? 'float' : 'sink');
  const wrong = challenge.id === 'ch_saturn_bath' ? 'Sink' : title(other);
  return challenge.id.length % 2 === 0 ? [answer, wrong] : [wrong, answer];
}

export function isCorrect(challenge: PackChallenge, said: string): boolean {
  const heard = ` ${normaliseAnswer(said).replace(/[^\p{L}\p{N} ]/gu, ' ')} `.replace(/\s+/g, ' ');
  return [challenge.answerKey, ...challenge.accepted].some((answer) =>
    heard.includes(` ${normaliseAnswer(answer)} `),
  );
}

export function createFakeLearn(options: FakeLearnOptions) {
  const profiles = new Map<string, Profile>();
  const profile = (childId: string) => {
    let found = profiles.get(childId);
    if (!found) {
      found = { points: options.startingPoints, pets: [], awarded: new Set() };
      for (const pet of PETS) if (pet.unlockPoints <= found.points) found.pets.push(pet.id);
      profiles.set(childId, found);
    }
    return found;
  };

  /** One connection's persona state. */
  return function session(childId: string, send: Send, schedule: Schedule) {
    let persona: { pack: WorldPack; characterId: string } | undefined;
    let quiz: { challenge: PackChallenge; misses: number } | undefined;
    const say = (text: string) =>
      send({ type: 'transcript', role: 'character', text, final: true });

    return {
      summon(packId: string, characterId: string, friend: string, sessionId: string) {
        const pack = Object.hasOwn(PACKS, packId) ? PACKS[packId] : undefined;
        const character = pack?.characters.find((c) => c.id === characterId);
        if (!pack || !character) {
          send({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'That character is not in this world.',
          });
          return;
        }
        persona = { pack, characterId };
        quiz = undefined;
        send({ type: 'interrupted' });
        send({ type: 'persona', packId, characterId, name: character.name });
        send({ type: 'ready', sessionId, characterId: friend as never });
        say(`${character.catchphrase} ${character.facts[0] ?? ''}`.trim());
        const challenge = pack.challenges.find(
          (c) => c.characterId === characterId && !profile(childId).awarded.has(c.id),
        );
        if (!challenge) return;
        schedule(() => {
          if (persona?.characterId !== characterId) return;
          quiz = { challenge, misses: 0 };
          send({
            type: 'quiz',
            challengeId: challenge.id,
            question: challenge.question,
            options: previewOptions(pack, challenge),
          });
        }, options.quizDelayMs);
      },
      /** Returns true when the text was an answer to the open challenge. */
      answer(text: string): boolean {
        if (!persona || !quiz) return false;
        const { challenge } = quiz;
        const child = profile(childId);
        if (child.awarded.has(challenge.id)) return true;
        if (!isCorrect(challenge, text)) {
          quiz.misses++;
          say(
            quiz.misses === 1 ? challenge.hint : `The answer is ${challenge.answerKey}. Nice try!`,
          );
          if (quiz.misses > 1) quiz = undefined;
          return true;
        }
        child.awarded.add(challenge.id);
        child.points += challenge.points;
        send({
          type: 'points',
          total: child.points,
          delta: challenge.points,
          reason: challenge.id,
        });
        for (const pet of PETS)
          if (
            !child.pets.includes(pet.id) &&
            (pet.unlockPoints <= child.points || pet.id === challenge.petReward)
          ) {
            child.pets.push(pet.id);
            send({ type: 'petUnlocked', petId: pet.id });
          }
        say('Yes! You got it!');
        quiz = undefined;
        return true;
      },
      hangUp(friend: string, sessionId: string) {
        if (!persona) return;
        persona = undefined;
        quiz = undefined;
        send({ type: 'interrupted' });
        send({ type: 'ready', sessionId, characterId: friend as never });
        say('I am back! What did you learn?');
      },
    };
  };
}
