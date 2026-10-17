import { describe, expect, it } from 'vitest';
import { correct, assessmentItems, QuizSubmissionSchema } from '../src/school/grading';
import type { LessonDoc, QuizItem } from '@just-imagine/protocol';
const numeric: QuizItem = {
  id: 'q1',
  kind: 'numeric',
  prompt: { en: 'Value', bn: 'মান' },
  unit: '',
  points: 2,
};
describe('assessment submission boundaries', () => {
  it('grades strict decimal forms at inclusive tolerance boundaries', () => {
    const key = {
      kind: 'numeric' as const,
      value: 1,
      tolerance: { mode: 'abs' as const, amount: 0.1 },
    };
    for (const input of ['১.১', '০.৯', 1.1, 0.9]) expect(correct(numeric, key, input)).toBe(true);
    for (const input of ['0x1', '0b1', '1kg', '', true])
      expect(correct(numeric, key, input)).toBe(false);
    expect(correct(numeric, { ...key, value: -1 }, '−১.১')).toBe(true);
    expect(
      correct(numeric, { ...key, tolerance: { mode: 'abs', amount: 0 } }, 1 + Number.EPSILON),
    ).toBe(false);
  });
  it('selects only the requested quiz section and preserves legacy all-question submissions', () => {
    const steps: LessonDoc['steps'] = [
      { kind: 'quiz', items: [numeric] },
      { kind: 'intro', body: { en: 'Read', bn: 'পড়ো' } },
      { kind: 'quiz', items: [{ ...numeric, id: 'q2' }] },
    ];
    expect(assessmentItems({ steps }, true, 0).map((i) => i.id)).toEqual(['q1']);
    expect(assessmentItems({ steps }, true, 2).map((i) => i.id)).toEqual(['q2']);
    expect(assessmentItems({ steps }, true).map((i) => i.id)).toEqual(['q1', 'q2']);
    expect(() => assessmentItems({ steps }, true, 1)).toThrow();
    expect(() => assessmentItems({ steps }, true, 99)).toThrow();
    expect(
      QuizSubmissionSchema.safeParse({
        revision: 0,
        stepIndex: 2,
        answers: [{ itemId: 'q2', answer: 1 }],
      }).success,
    ).toBe(true);
    expect(
      QuizSubmissionSchema.safeParse({
        revision: 0,
        stepIndex: -1,
        answers: [{ itemId: 'q2', answer: 1 }],
      }).success,
    ).toBe(false);
  });
});
