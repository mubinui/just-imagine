import { describe, expect, it } from 'vitest';
import { currentAttempt, parseSchoolNumber, withinNumericTolerance } from '../src/assessment';
import type { AttemptDoc } from '../src/school';

describe('school numeric grammar', () => {
  it('accepts decimal/Bangla/exponent forms and rejects Number-only coercions', () => {
    for (const [input, expected] of [
      [' −১২.৫০ ', -12.5],
      ['+.5', 0.5],
      ['২e−২', 0.02],
      [0, 0],
    ] as const)
      expect(parseSchoolNumber(input)).toBe(expected);
    for (const input of [
      '',
      ' ',
      '0x10',
      '0b10',
      '0o10',
      '1_000',
      '1kg',
      'Infinity',
      NaN,
      null,
      true,
      [],
    ])
      expect(parseSchoolNumber(input)).toBeNull();
  });
  it('includes representable absolute and relative endpoints without loosening zero tolerance', () => {
    for (const actual of [0.9, 1.1]) {
      expect(withinNumericTolerance(actual, 1, { mode: 'abs', amount: 0.1 })).toBe(true);
      expect(withinNumericTolerance(actual, 1, { mode: 'rel', amount: 0.1 })).toBe(true);
    }
    expect(withinNumericTolerance(1.100000000000001, 1, { mode: 'abs', amount: 0.1 })).toBe(false);
    expect(withinNumericTolerance(1 + Number.EPSILON, 1, { mode: 'abs', amount: 0 })).toBe(false);
    expect(withinNumericTolerance(Number.MIN_VALUE, 0, { mode: 'rel', amount: 0.1 })).toBe(false);
    expect(withinNumericTolerance(-1.1, -1, { mode: 'rel', amount: 0.1 })).toBe(true);
    expect(withinNumericTolerance(0.8, 0.7, { mode: 'abs', amount: 0.1 })).toBe(true);
    expect(withinNumericTolerance(1 + Number.EPSILON, 1, { mode: 'abs', amount: 1e-20 })).toBe(
      false,
    );
    expect(withinNumericTolerance(0.3, 0.2, { mode: 'rel', amount: 0.5 })).toBe(true);
  });
});

describe('attempt revision projection', () => {
  const historical: AttemptDoc = {
    studentId: 'student',
    lessonId: 'lesson',
    revision: 1,
    items: {
      q1: { correct: true, answer: 2, tries: 3, firstCorrectAt: 100, firstCorrectTry: 2 },
      practice: { correct: true, answer: 0, tries: 1, firstCorrectAt: null },
    },
    pointsAwarded: 4,
    completedAt: 100,
    updatedAt: 100,
  };
  it('keeps old answers and historical tries in the snapshot, but resets current correctness/completion', () => {
    const next = currentAttempt(historical, 2);
    expect(next).toMatchObject({
      revision: 2,
      items: {},
      completedAt: null,
      pointsAwarded: 4,
      creditedItemIds: ['q1'],
    });
    expect(historical.items.q1).toMatchObject({ correct: true, tries: 3, firstCorrectTry: 2 });
    expect(historical.completedAt).toBe(100);
  });
  it('unions lifetime credit and legacy credit markers without crediting practice checks', () => {
    expect(
      currentAttempt({ ...historical, creditedItemIds: ['retired', 'q1'] }, 1).creditedItemIds,
    ).toEqual(['retired', 'q1']);
    expect(currentAttempt(historical, 1).items).toEqual(historical.items);
  });
});
