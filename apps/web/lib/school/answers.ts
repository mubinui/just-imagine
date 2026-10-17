import type { QuizItem } from '@just-imagine/protocol';
import { SIMS, type SimId } from '@just-imagine/stem-sims';
/** Accept both numeral scripts without treating an empty answer as numeric zero. */
export function numericAnswer(raw: string): number {
  const normalized = raw
    .trim()
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replaceAll('−', '-');
  if (
    !normalized ||
    !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized) ||
    !Number.isFinite(Number(normalized))
  )
    throw new Error('Enter a numeric answer.');
  return Number(normalized);
}
export function assessmentAnswer(item: QuizItem, value: unknown): unknown {
  if (item.kind === 'numeric' && typeof value === 'string') return numericAnswer(value);
  if (item.kind === 'simTask') {
    const record =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(
      item.editableParams.filter((k) => Object.hasOwn(record, k)).map((k) => [k, record[k]]),
    );
  }
  if (value === undefined) throw new Error('Answer each question before submitting.');
  return value;
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
