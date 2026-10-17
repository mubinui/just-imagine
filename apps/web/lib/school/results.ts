import type { AttemptDoc } from '@just-imagine/protocol';

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
