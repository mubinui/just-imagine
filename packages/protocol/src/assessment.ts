import type { AttemptDoc } from './school';

/** School decimal notation, including Bangla digits and the printed minus sign. */
export function parseSchoolNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replaceAll('−', '-');
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function withinNumericTolerance(
  actual: number,
  expected: number,
  tolerance: { mode: 'abs' | 'rel'; amount: number },
): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  if (!Number.isFinite(tolerance.amount) || tolerance.amount < 0) return false;
  if (tolerance.amount === 0 || (tolerance.mode === 'rel' && expected === 0))
    return actual === expected;
  // Compare the canonical decimal values exactly. Binary subtraction can reject 1.1 at
  // 1±0.1; even endpoint addition can reject 0.8 at 0.7±0.1. No blanket epsilon widens
  // very small or zero tolerances. Finite JS numbers bound these integer scales.
  const a = decimal(actual),
    e = decimal(expected),
    t = decimal(tolerance.amount);
  const bound =
    tolerance.mode === 'rel'
      ? { coefficient: absolute(e.coefficient) * t.coefficient, exponent: e.exponent + t.exponent }
      : t;
  const exponent = Math.min(a.exponent, e.exponent, bound.exponent);
  return absolute(scaled(a, exponent) - scaled(e, exponent)) <= scaled(bound, exponent);
}

type Decimal = { coefficient: bigint; exponent: number };
function decimal(value: number): Decimal {
  const [mantissa, power] = value.toString().split('e');
  const fractionDigits = mantissa!.split('.')[1]?.length ?? 0;
  return {
    coefficient: BigInt(mantissa!.replace('.', '')),
    exponent: Number(power ?? 0) - fractionDigits,
  };
}
function absolute(value: bigint) {
  return value < 0n ? -value : value;
}
function scaled(value: Decimal, exponent: number) {
  return value.coefficient * 10n ** BigInt(value.exponent - exponent);
}

/** Credit survives a content revision; correctness and completion belong to that revision only. */
export function currentAttempt(attempt: AttemptDoc, revision: number): AttemptDoc {
  const creditedItemIds = [
    ...new Set([
      ...(attempt.creditedItemIds ?? []),
      ...Object.entries(attempt.items)
        .filter(([, item]) => item.firstCorrectAt !== null)
        .map(([id]) => id),
    ]),
  ];
  return {
    ...attempt,
    creditedItemIds,
    ...(attempt.revision === revision ? {} : { revision, items: {}, completedAt: null }),
  };
}
