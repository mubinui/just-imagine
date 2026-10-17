import { describe, expect, it } from 'vitest';
import type { AttemptDoc } from '@just-imagine/protocol';
import { firstTryResult } from '../lib/school/results';

const quizItemIds = ['q1', 'q2', 'q3'];
const answered = (firstCorrectTry: number, tries: number) => ({
  correct: true,
  tries,
  firstCorrectAt: 100,
  firstCorrectTry,
});

describe('teacher first-try results', () => {
  it('retains first-try success after retakes and counts only quiz questions', () => {
    const attempt: Pick<AttemptDoc, 'items'> = {
      items: { practice: answered(1, 1), q1: answered(1, 3), q2: answered(2, 4) },
    };
    expect(firstTryResult(quizItemIds, attempt)).toEqual({ correct: 1, total: 3 });
  });

  it('does not invent historical first-try success for legacy correct answers', () => {
    expect(
      firstTryResult(quizItemIds, {
        items: { q1: { correct: true, tries: 3, firstCorrectAt: 100 } },
      }),
    ).toBeNull();
    expect(firstTryResult(quizItemIds, null)).toBeNull();
  });

  it('counts an initial wrong answer as zero without hiding known history', () => {
    expect(
      firstTryResult(quizItemIds, {
        items: { q1: { correct: false, tries: 1, firstCorrectAt: null } },
      }),
    ).toEqual({ correct: 0, total: 3 });
  });
});
