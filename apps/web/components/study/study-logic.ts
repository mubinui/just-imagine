import type { AttemptDoc, QuizItem } from '@just-imagine/protocol';
import { assessmentAnswer } from '../../lib/school/answers';
import type { Lesson } from '../../lib/school/types';

/** Standard competition ranking (1, 1, 3); nobody is ranked before earning a point. */
export function competitionRanks(entries: readonly { points: number }[]): (number | null)[] {
  return entries.map((entry) =>
    entry.points > 0 ? 1 + entries.filter((other) => other.points > entry.points).length : null,
  );
}
export function displayRank(points: number | undefined, rank: number | null | undefined) {
  return points && points > 0 && rank ? rank : null;
}

export type Caption = { role: string; text: string; final: boolean; local?: boolean };
/**
 * A partial transcript is rewritten in place until its final version arrives, even when the
 * student typed a question while the reply was still streaming.
 */
export function mergeCaption(list: readonly Caption[], incoming: Caption): Caption[] {
  const last = list.at(-1);
  if (
    !incoming.local &&
    incoming.role === 'child' &&
    last?.local &&
    last.role === 'child' &&
    last.text.trim() === incoming.text.trim()
  )
    return [...list];
  const next = [...list];
  const open = incoming.local
    ? -1
    : next.findLastIndex((c) => c.role === incoming.role && !c.final);
  if (open >= 0) next[open] = incoming;
  else next.push(incoming);
  return next.slice(-30);
}

/** Runs at most once per `ms` with the newest value; the last value is never lost. */
export function newestEvery<T>(ms: number, run: (value: T) => void) {
  let last = -Infinity,
    timer: ReturnType<typeof setTimeout> | undefined,
    pending: { value: T } | undefined;
  const fire = () => {
    timer = undefined;
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    last = Date.now();
    run(value);
  };
  return {
    push(value: T) {
      pending = { value };
      const wait = last + ms - Date.now();
      if (wait <= 0) fire();
      else timer ??= setTimeout(fire, wait);
    },
    /** Forgets the waiting value; the next push goes out at once. */
    cancel() {
      clearTimeout(timer);
      timer = pending = undefined;
      last = -Infinity;
    },
  };
}

export function assessmentItems(step: Lesson['steps'][number] | undefined): QuizItem[] {
  if (!step) return [];
  if (step.kind === 'check') return [step.item];
  if (step.kind === 'quiz') return step.items;
  return [];
}
/** Items the grader would refuse, in page order, so the first can receive focus. */
export function unansweredItems(items: readonly QuizItem[], answers: Record<string, unknown>) {
  return items.filter((item) => {
    const value = answers[item.id];
    if (typeof value === 'string' && !value.trim()) return true;
    try {
      assessmentAnswer(item, value);
      return false;
    } catch {
      return true;
    }
  });
}

const allItems = (lesson: Pick<Lesson, 'steps'>) => lesson.steps.flatMap(assessmentItems);
/** The stored attempt becomes editable values again (numbers typed as text, choices as indexes). */
export function restoredAnswers(
  lesson: Pick<Lesson, 'steps'>,
  attempt: AttemptDoc | null | undefined,
): Record<string, unknown> {
  if (!attempt) return {};
  const restored: Record<string, unknown> = {};
  for (const item of allItems(lesson)) {
    const answer = attempt.items[item.id]?.answer;
    if (answer === undefined || answer === null) continue;
    restored[item.id] =
      item.kind === 'numeric' && typeof answer === 'number' ? String(answer) : answer;
  }
  return restored;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b) ||
  (typeof a === 'number' && typeof b === 'string' && String(a) === b.trim());
export function storedVerdict(
  attempt: AttemptDoc | null | undefined,
  item: QuizItem,
  value: unknown,
): boolean | undefined {
  const stored = attempt?.items[item.id];
  if (!stored || stored.answer === undefined || stored.answer === null) return undefined;
  return same(stored.answer, value) ? stored.correct : undefined;
}

export function quizPoints(lesson: Pick<Lesson, 'steps'>, attempt: AttemptDoc | null | undefined) {
  const max = lesson.steps.reduce(
    (sum, step) =>
      sum + (step.kind === 'quiz' ? step.items.reduce((n, item) => n + item.points, 0) : 0),
    0,
  );
  return { earned: attempt?.pointsAwarded ?? 0, max };
}

export function lessonProgress(
  lesson: Pick<Lesson, 'steps'>,
  attempt: AttemptDoc | null | undefined,
): { state: 'new' | 'progress' | 'done'; correct: number; total: number } {
  const quizIds = lesson.steps.flatMap((s) => (s.kind === 'quiz' ? s.items.map((i) => i.id) : []));
  const correct = quizIds.filter((id) => attempt?.items[id]?.correct).length;
  const state = attempt?.completedAt
    ? 'done'
    : attempt && Object.keys(attempt.items).length
      ? 'progress'
      : 'new';
  return { state, correct, total: quizIds.length };
}
