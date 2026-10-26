import { describe, expect, it, vi } from 'vitest';
import type { QuizItem, AttemptDoc } from '@just-imagine/protocol';
import {
  competitionRanks,
  displayRank,
  mergeCaption,
  newestEvery,
  unansweredItems,
  restoredAnswers,
  quizPoints,
  lessonProgress,
  storedVerdict,
} from '../components/study/study-logic';
import type { Lesson } from '../lib/school/types';

const mcq: QuizItem = {
  id: 'q1',
  kind: 'mcq',
  prompt: { en: 'Pick', bn: 'বাছো' },
  options: [
    { en: 'A', bn: 'ক' },
    { en: 'B', bn: 'খ' },
  ],
  points: 2,
} as QuizItem;
const numeric: QuizItem = {
  id: 'q2',
  kind: 'numeric',
  prompt: { en: 'v?', bn: 'v?' },
  unit: 'm/s',
  points: 3,
} as QuizItem;
const lesson = {
  id: 'l1',
  revision: 2,
  steps: [
    { kind: 'intro', body: { en: '', bn: '' } },
    { kind: 'check', item: { ...numeric, id: 'c1', points: 0 } },
    { kind: 'quiz', items: [mcq, numeric] },
  ],
} as unknown as Lesson;
const attempt = (items: AttemptDoc['items'], extra: Partial<AttemptDoc> = {}): AttemptDoc => ({
  studentId: 's1',
  lessonId: 'l1',
  revision: 2,
  items,
  pointsAwarded: 0,
  completedAt: null,
  updatedAt: 1,
  ...extra,
});

describe('leaderboard ranks', () => {
  it('gives tied scores the same rank and skips the next places (1, 1, 3)', () => {
    expect(competitionRanks([{ points: 9 }, { points: 9 }, { points: 4 }, { points: 4 }])).toEqual([
      1, 1, 3, 3,
    ]);
  });
  it('does not rank a student with zero points', () => {
    expect(competitionRanks([{ points: 5 }, { points: 0 }])).toEqual([1, null]);
    expect(displayRank(0, 1)).toBeNull();
    expect(displayRank(12, 2)).toBe(2);
    expect(displayRank(12, null)).toBeNull();
  });
});

describe('tutor captions', () => {
  it('replaces the partial line when the final transcript of the same role arrives', () => {
    let list = mergeCaption([], { role: 'character', text: 'Velocity is', final: false });
    list = mergeCaption(list, { role: 'character', text: 'Velocity is speed', final: false });
    list = mergeCaption(list, {
      role: 'character',
      text: 'Velocity is speed with direction.',
      final: true,
    });
    expect(list).toEqual([
      { role: 'character', text: 'Velocity is speed with direction.', final: true },
    ]);
  });
  it('starts a new line after a final one and keeps the student question visible', () => {
    let list = mergeCaption([], {
      role: 'child',
      text: 'What is slope?',
      final: true,
      local: true,
    });
    list = mergeCaption(list, { role: 'character', text: 'Slope is', final: false });
    list = mergeCaption(list, { role: 'character', text: 'Slope is steepness.', final: true });
    list = mergeCaption(list, { role: 'character', text: 'Try it.', final: true });
    expect(list.map((c) => c.text)).toEqual(['What is slope?', 'Slope is steepness.', 'Try it.']);
  });
  it('finishes a reply in its own bubble when the student typed while it was streaming', () => {
    let list = mergeCaption([], { role: 'character', text: 'Velocity is', final: false });
    list = mergeCaption(list, { role: 'child', text: 'Why?', final: true, local: true });
    list = mergeCaption(list, { role: 'character', text: 'Velocity is speed.', final: true });
    expect(list.map((c) => [c.role, c.text, c.final])).toEqual([
      ['character', 'Velocity is speed.', true],
      ['child', 'Why?', true],
    ]);
  });
  it('does not repeat a typed question if the gateway echoes it back', () => {
    let list = mergeCaption([], { role: 'child', text: 'Why?', final: true, local: true });
    list = mergeCaption(list, { role: 'child', text: 'Why?', final: true });
    expect(list).toHaveLength(1);
  });
});

describe('quiz answers', () => {
  it('lists every unanswered or invalid question in order', () => {
    expect(unansweredItems([mcq, numeric], {}).map((i) => i.id)).toEqual(['q1', 'q2']);
    expect(unansweredItems([mcq, numeric], { q1: 1, q2: '' }).map((i) => i.id)).toEqual(['q2']);
    expect(unansweredItems([mcq, numeric], { q1: 0, q2: '১২' })).toEqual([]);
  });
  it('restores stored answers into editable values', () => {
    const stored = attempt({
      q1: { correct: true, answer: 1, tries: 1, firstCorrectAt: 5 },
      q2: { correct: false, answer: 12, tries: 2, firstCorrectAt: null },
    });
    expect(restoredAnswers(lesson, stored)).toEqual({ q1: 1, q2: '12' });
    expect(restoredAnswers(lesson, null)).toEqual({});
  });
  it('reports the stored verdict only while the answer is unchanged', () => {
    const stored = attempt({ q1: { correct: true, answer: 1, tries: 1, firstCorrectAt: 5 } });
    expect(storedVerdict(stored, mcq, 1)).toBe(true);
    expect(storedVerdict(stored, mcq, 0)).toBeUndefined();
    expect(storedVerdict(stored, numeric, '4')).toBeUndefined();
  });
  it('totals quiz points against the lesson maximum', () => {
    expect(quizPoints(lesson, attempt({}, { pointsAwarded: 3 }))).toEqual({ earned: 3, max: 5 });
    expect(quizPoints(lesson, null)).toEqual({ earned: 0, max: 5 });
  });
  it('summarises lesson progress from correct quiz answers', () => {
    expect(lessonProgress(lesson, undefined)).toMatchObject({ state: 'new', correct: 0, total: 2 });
    expect(
      lessonProgress(lesson, attempt({ q1: { correct: true, tries: 1, firstCorrectAt: 1 } })),
    ).toMatchObject({ state: 'progress', correct: 1, total: 2 });
    expect(lessonProgress(lesson, attempt({}, { completedAt: 9 }))).toMatchObject({
      state: 'done',
    });
  });
});

describe('newest value throttle', () => {
  it('passes the first value at once and the last one after the gap, dropping only the middle', () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn(),
        throttle = newestEvery(1000, run);
      throttle.push(1);
      throttle.push(2);
      throttle.push(3);
      expect(run.mock.calls).toEqual([[1]]);
      vi.advanceTimersByTime(1000);
      expect(run.mock.calls).toEqual([[1], [3]]);
      throttle.push(4);
      throttle.cancel();
      vi.advanceTimersByTime(5000);
      expect(run.mock.calls).toEqual([[1], [3]]);
    } finally {
      vi.useRealTimers();
    }
  });
});
