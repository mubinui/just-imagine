import { describe, expect, it } from 'vitest';
import type { AttemptDoc } from '@just-imagine/protocol';
import type { Lesson } from '../lib/school/types';
import { firstTryResult, quizCompletion, resultLessonChoices } from '../lib/school/results';

const quizItemIds = ['q1', 'q2', 'q3'];
const answered = (firstCorrectTry: number, tries: number) => ({
  correct: true,
  tries,
  firstCorrectAt: 100,
  firstCorrectTry,
});

describe('teacher results coverage', () => {
  it('does not show a completed practice item as a completed quiz', () => {
    expect(quizCompletion(quizItemIds, { items: { practice: answered(1, 1) } })).toEqual({
      correct: 0,
      total: 3,
    });
  });

  it('uses all current quiz IDs as the denominator and ignores stale or practice records', () => {
    expect(
      quizCompletion(quizItemIds, {
        items: {
          practice: answered(1, 1),
          staleQuiz: answered(1, 1),
          q1: answered(2, 2),
          q2: { correct: false, tries: 1, firstCorrectAt: null },
        },
      }),
    ).toEqual({ correct: 1, total: 3 });
    expect(quizCompletion(quizItemIds, null)).toBeNull();
  });

  it('includes published global results choices once while retaining school history', () => {
    const school: Pick<Lesson, 'id' | 'scope' | 'status'> = {
      id: 'school',
      scope: 'school',
      status: 'archived',
    };
    const shared = { id: 'shared', scope: 'global', status: 'published' } as const;
    const globalDraft = { id: 'draft', scope: 'global', status: 'draft' } as const;
    const globalArchived = { id: 'old', scope: 'global', status: 'archived' } as const;
    const wrongScope = { id: 'other-school', scope: 'school', status: 'published' } as const;
    expect(
      resultLessonChoices([school], [shared, shared, globalDraft, globalArchived, wrongScope]),
    ).toEqual([school, shared]);
    expect(resultLessonChoices([shared], [shared])).toEqual([shared]);
  });
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
