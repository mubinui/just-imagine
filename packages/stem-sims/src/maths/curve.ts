import { z } from 'zod';

/** The curve families a maths preset can draw. Coefficients mean different things per family:
 *  linear a·x + b; quadratic a·x² + b·x + c; cubic a·x³ + b·x² + c·x + d;
 *  sine a·sin(b·x + c) + d; exponential a·e^(b·x) + c; logarithm a·ln(b·x) + c. */
export const CURVE_FAMILIES = [
  'linear',
  'quadratic',
  'cubic',
  'sine',
  'exponential',
  'logarithm',
] as const;
export type CurveFamily = (typeof CURVE_FAMILIES)[number];

const coefficient = z.number().min(-10).max(10);
export const curveShape = {
  family: z.enum(CURVE_FAMILIES),
  a: coefficient,
  b: coefficient,
  c: coefficient,
  d: coefficient,
};
export const CurveSchema = z.strictObject(curveShape);
export type CurveParams = z.infer<typeof CurveSchema>;

/** The visible window every maths preset draws and searches, in both axes. */
export const VIEW = { min: -10, max: 10 } as const;

const finite = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** f(x), or null where the curve is undefined (a logarithm of zero or less). */
export function evaluate(p: CurveParams, x: number): number | null {
  switch (p.family) {
    case 'linear':
      return finite(p.a * x + p.b);
    case 'quadratic':
      return finite(p.a * x * x + p.b * x + p.c);
    case 'cubic':
      return finite(p.a * x ** 3 + p.b * x * x + p.c * x + p.d);
    case 'sine':
      return finite(p.a * Math.sin(p.b * x + p.c) + p.d);
    case 'exponential':
      return finite(p.a * Math.exp(p.b * x) + p.c);
    case 'logarithm':
      return p.b * x > 0 ? finite(p.a * Math.log(p.b * x) + p.c) : null;
  }
}

/** The exact derivative f′(x), or null where f is undefined. */
export function slope(p: CurveParams, x: number): number | null {
  switch (p.family) {
    case 'linear':
      return p.a;
    case 'quadratic':
      return finite(2 * p.a * x + p.b);
    case 'cubic':
      return finite(3 * p.a * x * x + 2 * p.b * x + p.c);
    case 'sine':
      return finite(p.a * p.b * Math.cos(p.b * x + p.c));
    case 'exponential':
      return finite(p.a * p.b * Math.exp(p.b * x));
    case 'logarithm':
      return p.b * x > 0 ? p.a / x : null;
  }
}

const SAMPLES = 2000;

/** Real roots inside the view window, ascending. Exact for lines and quadratics; otherwise found by
 *  scanning for sign changes and bisecting each one. */
export function roots(p: CurveParams): number[] {
  if (p.family === 'linear') return p.a === 0 ? [] : inView([-p.b / p.a]);
  if (p.family === 'quadratic' && p.a !== 0) {
    const disc = p.b * p.b - 4 * p.a * p.c;
    if (disc < 0) return [];
    if (disc === 0) return inView([-p.b / (2 * p.a)]);
    const r = Math.sqrt(disc);
    return inView([(-p.b - r) / (2 * p.a), (-p.b + r) / (2 * p.a)].sort((m, n) => m - n));
  }
  const found: number[] = [];
  const step = (VIEW.max - VIEW.min) / SAMPLES;
  for (let i = 0; i < SAMPLES; i++) {
    const lo = VIEW.min + i * step,
      hi = lo + step;
    const flo = evaluate(p, lo),
      fhi = evaluate(p, hi);
    if (flo === null || fhi === null) continue;
    if (flo === 0) found.push(lo);
    else if (flo * fhi < 0) found.push(bisect(p, lo, hi));
  }
  const last = evaluate(p, VIEW.max);
  if (last === 0) found.push(VIEW.max);
  return found.filter((r, i) => i === 0 || Math.abs(r - found[i - 1]!) > 1e-6);
}

function inView(values: number[]): number[] {
  return values.filter((v) => v >= VIEW.min && v <= VIEW.max);
}

function bisect(p: CurveParams, lo: number, hi: number): number {
  let a = lo,
    b = hi,
    fa = evaluate(p, a)!;
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2,
      fm = evaluate(p, m)!;
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}
