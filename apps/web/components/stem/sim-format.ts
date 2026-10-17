import {
  ORBIT_SCREEN_S,
  INCLINE_HORIZON_S,
  PENDULUM_MAX_T,
  SIMS,
  pendulum,
  reactionRate,
  collision,
  trialRate,
  type CurveParams,
  type SimId,
} from '@just-imagine/stem-sims';

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
  projectile: ['Projectile motion', 'প্রক্ষেপকের গতি'],
  'vector-addition': ['Adding two vectors', 'দুটি ভেক্টরের যোগ'],
  incline: ['Forces on an inclined plane', 'আনত তলে বল'],
  pendulum: ['Energy in a pendulum', 'সরল দোলকের শক্তি'],
  spring: ['Spring and simple harmonic motion', 'স্প্রিং ও সরল ছন্দিত স্পন্দন'],
  collision: ['Collisions and momentum', 'সংঘর্ষ ও ভরবেগ'],
  orbit: ['Gravity and orbits', 'মহাকর্ষ ও কক্ষপথ'],
  'ph-indicator': ['pH and indicators', 'pH ও নির্দেশক'],
  titration: ['Acid–base titration', 'এসিড-ক্ষার টাইট্রেশন'],
  'flame-test': ['Flame test for metal ions', 'ধাতব আয়নের শিখা পরীক্ষা'],
  'reaction-rate': ['Rate of reaction', 'বিক্রিয়ার হার'],
  'gas-law': ['Gas laws: PV = nRT', 'গ্যাসের সূত্র: PV = nRT'],
  'function-grapher': ['Function grapher', 'ফাংশনের লেখচিত্র'],
  derivative: ['Derivative as the slope of a tangent', 'স্পর্শকের ঢাল হিসেবে অন্তরজ'],
  'riemann-area': ['Area under a curve', 'বক্ররেখার নিচের ক্ষেত্রফল'],
  probability: ['Probability experiments', 'সম্ভাবনার পরীক্ষা'],
  'trig-waves': ['Sine and cosine waves', 'সাইন ও কোসাইন তরঙ্গ'],
};
export function simName(id: SimId, language: SimLanguage): string {
  const name = NAMES[id];
  return name ? name[language === 'bn' ? 1 : 0] : id;
}

const TIMED: ReadonlySet<SimId> = new Set<SimId>([
  'motion-graphs',
  'newton-cart',
  'projectile',
  'incline',
  'pendulum',
  'spring',
  'collision',
  'orbit',
  'reaction-rate',
  'probability',
  'trig-waves',
]);
/** Only these models change over time; the others are static and need no clock. */
export function isTimedSim(id: SimId): boolean {
  return TIMED.has(id);
}

/** Squeeze or stretch a run so it plays in 2 to 10 real seconds. */
const fit = (horizon: number) => {
  const h = Math.max(horizon, 0.01);
  return { horizon: h, scale: h / Math.min(10, Math.max(2, h)) };
};

/**
 * How long a run lasts in model seconds (horizon) and how many model seconds pass per real
 * second (scale). Static sims have no clock.
 */
export function simClock(id: SimId, params: unknown): { horizon: number; scale: number } {
  const p = params as Record<string, number>;
  switch (id) {
    case 'motion-graphs':
      return { horizon: p.duration ?? 5, scale: 1 };
    case 'newton-cart':
      return { horizon: 5, scale: 1 };
    case 'projectile':
      return fit(SIMS.projectile.solve(params as never)['flightTime'] as number);
    case 'incline':
      return { horizon: INCLINE_HORIZON_S, scale: 1 };
    case 'pendulum': {
      const period = pendulum.solve(params as never)['period'] as number;
      return { horizon: Math.min(PENDULUM_MAX_T, Math.max(10, 4 * period)), scale: 1 };
    }
    case 'spring': {
      const period = SIMS.spring.solve(params as never)['period'] as number;
      return { horizon: Math.min(60, Math.max(8, 6 * period)), scale: 1 };
    }
    case 'collision':
      return fit((collision.solve(params as never)['contactTime'] as number) + 3);
    case 'orbit':
      return { horizon: ORBIT_SCREEN_S, scale: 1 };
    case 'reaction-rate': {
      const halfLife = reactionRate.at(params as never, 0)['halfLife'] as number;
      const horizon = Math.min(600, Math.max(10, 5 * halfLife));
      return { horizon, scale: horizon / 10 };
    }
    case 'probability':
      return { horizon: p.trials! / trialRate(params as never), scale: 1 };
    case 'trig-waves':
      return { horizon: 12, scale: 1 };
    default:
      return { horizon: 0, scale: 1 };
  }
}

/** Terms joined the way a textbook writes them: no "+ −", no "1x", zero terms dropped. */
function terms(parts: [number, string][], language: SimLanguage): string {
  let out = '';
  for (const [raw, body] of parts) {
    const coef = Math.abs(raw) < 1e-9 ? 0 : raw;
    if (coef === 0) continue;
    const size = Math.abs(coef);
    const shown =
      body && size === 1 ? '' : formatNumber(size, language) + (/^[a-z]{2}/.test(body) ? ' ' : '');
    const sign = coef < 0 ? (out ? ' − ' : MINUS) : out ? ' + ' : '';
    out += sign + shown + body;
  }
  return out;
}

/** The curve a maths preset draws, e.g. y = x² − 2x − 3 or y = 2 sin(3x + 1). */
export function curveEquation(p: CurveParams, language: SimLanguage): string {
  const inner = (b: number, c = 0) =>
    terms(
      [
        [b, 'x'],
        [c, ''],
      ],
      language,
    ) || formatNumber(0, language);
  let right: string;
  switch (p.family) {
    case 'linear':
      right = terms(
        [
          [p.a, 'x'],
          [p.b, ''],
        ],
        language,
      );
      break;
    case 'quadratic':
      right = terms(
        [
          [p.a, 'x²'],
          [p.b, 'x'],
          [p.c, ''],
        ],
        language,
      );
      break;
    case 'cubic':
      right = terms(
        [
          [p.a, 'x³'],
          [p.b, 'x²'],
          [p.c, 'x'],
          [p.d, ''],
        ],
        language,
      );
      break;
    case 'sine':
      right = terms(
        [
          [p.a, `sin(${inner(p.b, p.c)})`],
          [p.d, ''],
        ],
        language,
      );
      break;
    case 'exponential':
      right = terms(
        [
          [p.a, `e^(${inner(p.b)})`],
          [p.c, ''],
        ],
        language,
      );
      break;
    case 'logarithm':
      right = terms(
        [
          [p.a, `ln(${inner(p.b)})`],
          [p.c, ''],
        ],
        language,
      );
      break;
  }
  return `y = ${right || formatNumber(0, language)}`;
}

/** Models report colours as 0xRRGGBB numbers; SVG wants #rrggbb. */
export function hexColour(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? '#' + Math.round(value).toString(16).padStart(6, '0')
    : null;
}
