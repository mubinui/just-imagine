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
