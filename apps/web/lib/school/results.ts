import type { AttemptDoc } from '@just-imagine/protocol';
import type { Lesson } from './types';

/** Practice and stale item records cannot count toward the current quiz. */
export function quizCompletion(
  quizItemIds: readonly string[],
  attempt: Pick<AttemptDoc, 'items'> | null,
): { correct: number; total: number } | null {
  if (!attempt) return null;
  return {
    correct: quizItemIds.filter((id) => attempt.items[id]?.correct).length,
    total: quizItemIds.length,
  };
}

/** Results can inspect shared lessons without granting access to their authoring keys. */
export function resultLessonChoices<T extends Pick<Lesson, 'id' | 'scope' | 'status'>>(
  schoolLessons: readonly T[],
  globalLessons: readonly T[],
): T[] {
  const seen = new Set<string>();
  return [
    ...schoolLessons,
    ...globalLessons.filter((lesson) => lesson.scope === 'global' && lesson.status === 'published'),
  ].filter((lesson) => {
    if (seen.has(lesson.id)) return false;
    seen.add(lesson.id);
    return true;
  });
}

/** First-correct history survives retakes; legacy records are never guessed. */
export function firstTryResult(
  quizItemIds: readonly string[],
  attempt: Pick<AttemptDoc, 'items'> | null,
): { correct: number; total: number } | null {
  if (!attempt) return null;
  if (
    quizItemIds.some(
      (id) => attempt.items[id]?.firstCorrectAt && !attempt.items[id]?.firstCorrectTry,
    )
  )
    return null;
  return {
    correct: quizItemIds.filter((id) => attempt.items[id]?.firstCorrectTry === 1).length,
    total: quizItemIds.length,
  };
}

export type QuizProgress = {
  status: 'notStarted' | 'inProgress' | 'submitted';
  /** Current quiz score, only once every quiz question has been submitted. */
  score: { correct: number; total: number } | null;
};
/** A quiz counts as submitted only when every current quiz question has an answer on record. */
export function quizProgress(
  quizItemIds: readonly string[],
  attempt: Pick<AttemptDoc, 'items'> | null,
): QuizProgress {
  if (!attempt || !Object.keys(attempt.items).length) return { status: 'notStarted', score: null };
  const submitted =
    quizItemIds.length > 0 && quizItemIds.every((id) => (attempt.items[id]?.tries ?? 0) > 0);
  return submitted
    ? { status: 'submitted', score: quizCompletion(quizItemIds, attempt) }
    : { status: 'inProgress', score: null };
}

const STATUS_ORDER = { published: 0, draft: 1, archived: 2 } as const;
/** School and shared lessons in separate groups, by title, with live lessons before drafts. */
export function groupResultLessons<
  T extends Pick<Lesson, 'id' | 'scope' | 'status'> & { title: { en: string; bn: string } },
>(schoolLessons: readonly T[], globalLessons: readonly T[], language: 'en' | 'bn' = 'en') {
  const order = (a: T, b: T) =>
    a.title[language].localeCompare(b.title[language], language === 'bn' ? 'bn' : 'en') ||
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  const all = resultLessonChoices(schoolLessons, globalLessons);
  return {
    school: all.filter((l) => l.scope !== 'global').sort(order),
    shared: all.filter((l) => l.scope === 'global').sort(order),
  };
}
