import { SIMS } from '@just-imagine/stem-sims';
import type { LabProposal } from '@just-imagine/protocol';
import type { SchoolModel } from '../../src/school/ai';

/** A projectile lab for physics chapter 2 that passes every generation check. */
export const request = {
  subject: 'physics',
  grade: 9,
  chapterId: 'physics-2',
  title: { en: 'Projectiles', bn: 'প্রক্ষেপক' },
  description: 'A ball launched from a cliff; students find the angle that hits the target.',
  language: 'en',
};
export const start = { speed: 20, angle: 30, height: 10, gravity: 9.8 };
const target = Number(SIMS.projectile.solve({ ...start, angle: 45 }).range);

export function proposal(change: (p: LabProposal) => void = () => {}): LabProposal {
  const p: LabProposal = {
    step: {
      kind: 'explore',
      simId: 'projectile',
      params: start,
      lockedParams: ['gravity'],
      prompts: [
        {
          en: 'Predict: which angle lands furthest?',
          bn: 'আগে অনুমান: কোন কোণে বল সবচেয়ে দূরে পড়বে?',
        },
        { en: 'Observe: change the angle and read the range.', bn: 'দেখো: কোণ বদলে পাল্লা পড়ো।' },
        {
          en: 'Explain: why does the height change the best angle?',
          bn: 'ব্যাখ্যা: উচ্চতা কেন সেরা কোণ বদলায়?',
        },
      ],
    },
    task: {
      item: {
        id: 'lab1',
        kind: 'simTask',
        prompt: {
          en: 'Change the angle so the ball hits the target.',
          bn: 'কোণ বদলে বলটি লক্ষ্যে ফেলো।',
        },
        simId: 'projectile',
        startParams: start,
        editableParams: ['angle'],
        points: 3,
      },
      key: {
        kind: 'simTask',
        predicate: 'hitsTarget',
        args: { x: target, tol: 0.5 },
        exampleAnswer: { angle: 45 },
      },
      hints: [
        { en: 'Compare the range at two angles first.', bn: 'আগে দুটি কোণে পাল্লা তুলনা করো।' },
        {
          en: 'From a height, the best angle is lower than on flat ground.',
          bn: 'উঁচু থেকে ছুড়লে সেরা কোণ সমতলের চেয়ে কম হয়।',
        },
      ],
    },
    summary: { en: 'A ball launched from a cliff', bn: 'খাড়া পাড় থেকে ছোড়া বল' },
  };
  change(p);
  return p;
}
/** A fake model that answers from a queue and records every prompt it was sent. */
export function scripted(...answers: unknown[]) {
  const prompts: string[] = [];
  const model: SchoolModel = async (prompt) => {
    prompts.push(prompt);
    return answers.shift();
  };
  return { model, prompts };
}
