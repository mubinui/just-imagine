import type { SimId, ObservableValue } from '@just-imagine/stem-sims';

type ReadingLabel = { en: string; bn: string; unit: string };
const motion: Record<string, ReadingLabel> = {
  t: { en: 'Elapsed time', bn: 'অতিক্রান্ত সময়', unit: 's' },
  x: { en: 'Displacement', bn: 'সরণ', unit: 'm' },
  v: { en: 'Velocity', bn: 'বেগ', unit: 'm/s' },
};
const labels: Record<SimId, Record<string, ReadingLabel>> = {
  'motion-graphs': motion,
  'newton-cart': {
    ...motion,
    moving: { en: 'Motion state', bn: 'গতির অবস্থা', unit: '' },
    a: { en: 'Acceleration', bn: 'ত্বরণ', unit: 'm/s²' },
    friction: { en: 'Friction force', bn: 'ঘর্ষণ বল', unit: 'N' },
    net: { en: 'Net force', bn: 'লব্ধি বল', unit: 'N' },
    staticLimit: { en: 'Maximum static friction', bn: 'সর্বোচ্চ স্থিত ঘর্ষণ', unit: 'N' },
  },
  'ohms-circuit': {
    req: { en: 'Equivalent resistance', bn: 'তুল্য রোধ', unit: 'Ω' },
    current: { en: 'Circuit current', bn: 'বর্তনীর তড়িৎপ্রবাহ', unit: 'A' },
    ...Object.fromEntries(
      [0, 1, 2].flatMap((index) => [
        [
          `v${index}`,
          {
            en: `Voltage across resistor ${index + 1}`,
            bn: `${index + 1} নম্বর রোধের বিভব পার্থক্য`,
            unit: 'V',
          },
        ],
        [
          `i${index}`,
          {
            en: `Current through resistor ${index + 1}`,
            bn: `${index + 1} নম্বর রোধে তড়িৎপ্রবাহ`,
            unit: 'A',
          },
        ],
        [
          `p${index}`,
          {
            en: `Power in resistor ${index + 1}`,
            bn: `${index + 1} নম্বর রোধের ক্ষমতা`,
            unit: 'W',
          },
        ],
      ]),
    ),
  },
  'linear-graph': {
    slope: { en: 'Slope', bn: 'ঢাল', unit: '' },
    intercept: { en: 'Vertical intercept', bn: 'উল্লম্ব অক্ষছেদ', unit: '' },
    xIntercept: { en: 'Horizontal intercept', bn: 'অনুভূমিক অক্ষছেদ', unit: '' },
  },
  'unit-circle': {
    angleDeg: { en: 'Angle', bn: 'কোণ', unit: '°' },
    sin: { en: 'Sine', bn: 'সাইন', unit: '' },
    cos: { en: 'Cosine', bn: 'কোসাইন', unit: '' },
    tan: { en: 'Tangent', bn: 'ট্যানজেন্ট', unit: '' },
    quadrant: { en: 'Quadrant', bn: 'চতুর্ভাগ', unit: '' },
  },
};

export function readingLabel(
  id: SimId,
  key: string,
  language: 'en' | 'bn',
): { label: string; unit: string } | null {
  const entry = labels[id][key];
  return entry ? { label: entry[language], unit: entry.unit } : null;
}

/** Interpret categorical outputs as the model defines them; never show booleans as checkmarks. */
export function readingState(
  id: SimId,
  key: string,
  value: ObservableValue,
  language: 'en' | 'bn',
): string | null {
  if (key === 'moving' && typeof value === 'boolean')
    return language === 'bn' ? (value ? 'চলছে' : 'স্থির') : value ? 'Moving' : 'At rest';
  if (id === 'unit-circle' && key === 'quadrant' && value === 0)
    return language === 'bn' ? 'অক্ষের উপর' : 'On an axis';
  if (value === null) return language === 'bn' ? 'সংজ্ঞায়িত নয়' : 'Not defined';
  return null;
}

/** Both force arrows share one display scale; labels carry exact Newton values. */
export function forceVectorLengths(
  applied: number,
  friction: number,
): { applied: number; friction: number } {
  const scale = 170 / Math.max(10, applied, friction);
  return { applied: applied * scale, friction: friction * scale };
}
