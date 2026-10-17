import type { SimId } from '@just-imagine/stem-sims';

export type SimLanguage = 'en' | 'bn';
const MINUS = '−';

/** Readouts follow the page language; a true minus sign keeps negative values legible. */
export function formatNumber(value: unknown, language: SimLanguage, fractionDigits = 3): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (typeof value !== 'number') return String(value ?? '');
  if (!Number.isFinite(value)) return '—';
  const n = Math.abs(value) < 1e-9 ? 0 : value;
  return n
    .toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
      maximumFractionDigits: fractionDigits,
    })
    .replace('-', MINUS);
}

/** y = mx + c written the way a textbook would: no "+ −3", no "1x", no "+ 0". */
export function linearEquation(m: number, c: number, language: SimLanguage): string {
  const slope = Math.abs(m) < 1e-9 ? 0 : m,
    intercept = Math.abs(c) < 1e-9 ? 0 : c;
  const magnitude = (v: number) => formatNumber(Math.abs(v), language);
  let right = '';
  if (slope !== 0)
    right = (slope < 0 ? MINUS : '') + (Math.abs(slope) === 1 ? '' : magnitude(slope)) + 'x';
  if (intercept !== 0)
    right += right
      ? ` ${intercept < 0 ? MINUS : '+'} ${magnitude(intercept)}`
      : formatNumber(intercept, language);
  return `y = ${right || formatNumber(0, language)}`;
}

/** Dragging lands on the same grid as the slider, never on 7.142857142857143. */
export function snapToStep(value: number, p: { min: number; max: number; step: number }): number {
  const decimals = (String(p.step).split('.')[1] ?? '').length;
  const snapped = p.min + Math.round((value - p.min) / p.step) * p.step;
  const clamped = Math.min(p.max, Math.max(p.min, snapped));
  const rounded = Number(clamped.toFixed(decimals));
  return Object.is(rounded, -0) ? 0 : rounded;
}

const NAMES: Record<SimId, [string, string]> = {
  'motion-graphs': [
    'Motion graphs: position and velocity over time',
    'গতির লেখচিত্র: সময়ের সঙ্গে অবস্থান ও বেগ',
  ],
  'newton-cart': ['Force and friction on a cart', 'গাড়ির ওপর বল ও ঘর্ষণ'],
  'ohms-circuit': ["Ohm's law circuit", 'ওহমের সূত্রের বর্তনী'],
  'linear-graph': ['Straight-line graph y = mx + c', 'সরলরেখার লেখচিত্র y = mx + c'],
  'unit-circle': ['Unit circle with sine and cosine', 'সাইন ও কোসাইনসহ একক বৃত্ত'],
};
export function simName(id: SimId, language: SimLanguage): string {
  const name = NAMES[id];
  return name ? name[language === 'bn' ? 1 : 0] : id;
}
/** Only these models change over time; the others are static and need no clock. */
export function isTimedSim(id: SimId): boolean {
  return id === 'motion-graphs' || id === 'newton-cart';
}
