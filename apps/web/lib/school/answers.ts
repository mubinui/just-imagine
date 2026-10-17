import { parseSchoolNumber, type QuizItem } from '@just-imagine/protocol';
import { SIMS, type SimId } from '@just-imagine/stem-sims';
/** Accept both numeral scripts without treating an empty answer as numeric zero. */
export function numericAnswer(raw: string): number {
  const number = parseSchoolNumber(raw);
  if (number === null) throw new Error('Enter a numeric answer.');
  return number;
}
export function assessmentAnswer(item: QuizItem, value: unknown): unknown {
  if (item.kind === 'numeric' && typeof value === 'string') return numericAnswer(value);
  if (item.kind === 'simTask') {
    const record =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    const submitted = Object.fromEntries(
      item.editableParams.filter((k) => Object.hasOwn(record, k)).map((k) => [k, record[k]]),
    );
    if (
      !Object.hasOwn(SIMS, item.simId) ||
      !SIMS[item.simId as SimId].params.safeParse({ ...item.startParams, ...submitted }).success
    )
      throw new Error('Enter valid simulation parameters before submitting.');
    return submitted;
  }
  if (value === undefined) throw new Error('Answer each question before submitting.');
  return value;
}

/** A pending result becomes obsolete after edits, navigation, revision changes or unmount. */
export function assessmentRequests() {
  let version = 0;
  return {
    invalidate() {
      version++;
    },
    capture() {
      const started = version;
      return () => version === started;
    },
  };
}
export function applyTutorSuggestion(
  simId: string,
  current: Record<string, unknown>,
  key: string,
  value: number,
  locked: readonly string[],
): Record<string, unknown> | null {
  if (
    !Object.hasOwn(SIMS, simId) ||
    locked.includes(key) ||
    !Object.hasOwn(current, key) ||
    !Number.isFinite(value)
  )
    return null;
  const next = { ...current, [key]: value };
  return SIMS[simId as SimId].params.safeParse(next).success ? next : null;
}
