import {
  FLAMES,
  INDICATOR_COLOURS,
  type ObservableValue,
  type SimId,
} from '@just-imagine/stem-sims';
import { formatNumber } from '../../components/stem/sim-format';

export type ReadingLabel = { en: string; bn: string; unit: string };
const L = (en: string, bn: string, unit = ''): ReadingLabel => ({ en, bn, unit });

const MEGA = '×10⁶ m';
const time = L('Time', 'সময়', 's');
const energy = {
  kinetic: L('Kinetic energy', 'গতিশক্তি', 'J'),
  thermal: L('Thermal energy', 'তাপশক্তি', 'J'),
};
const oscillation = {
  period: L('Period', 'দোলনকাল', 's'),
  frequency: L('Frequency', 'কম্পাঙ্ক', 'Hz'),
  maxSpeed: L('Maximum speed', 'সর্বোচ্চ দ্রুতি', 'm/s'),
  energy: L('Total energy', 'মোট শক্তি', 'J'),
};
const curve = {
  x: L('Point x', 'বিন্দুর x'),
};
const outcomes = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    [`count${i}`, L(`Count of outcome ${i + 1}`, `ফল ${i + 1}-এর গণসংখ্যা`)],
    [
      `relative${i}`,
      L(`Relative frequency of outcome ${i + 1}`, `ফল ${i + 1}-এর আপেক্ষিক গণসংখ্যা`),
    ],
    [
      `theoretical${i}`,
      L(`Theoretical chance of outcome ${i + 1}`, `ফল ${i + 1}-এর তাত্ত্বিক সম্ভাবনা`),
    ],
  ]).flat(),
) as Record<string, ReadingLabel>;

/** Labels for every value the library models report, from at() and solve(). */
export const STEM_READING_LABELS: Partial<Record<SimId, Record<string, ReadingLabel>>> = {
  projectile: {
    t: time,
    x: L('Horizontal distance', 'অনুভূমিক দূরত্ব', 'm'),
    y: L('Height', 'উচ্চতা', 'm'),
    vx: L('Horizontal velocity', 'অনুভূমিক বেগ', 'm/s'),
    vy: L('Vertical velocity', 'উল্লম্ব বেগ', 'm/s'),
    landed: L('Landed', 'ভূমিতে পড়েছে'),
    range: L('Range', 'পাল্লা', 'm'),
    apex: L('Maximum height', 'সর্বোচ্চ উচ্চতা', 'm'),
    apexX: L('Distance to the top', 'সর্বোচ্চ বিন্দুর দূরত্ব', 'm'),
    flightTime: L('Flight time', 'উড্ডয়নকাল', 's'),
    impactSpeed: L('Landing speed', 'ভূমি স্পর্শের দ্রুতি', 'm/s'),
  },
  'vector-addition': {
    ax: L('A, x-component', 'A-এর x-উপাংশ', 'units'),
    ay: L('A, y-component', 'A-এর y-উপাংশ', 'units'),
    bx: L('B, x-component', 'B-এর x-উপাংশ', 'units'),
    by: L('B, y-component', 'B-এর y-উপাংশ', 'units'),
    rx: L('Resultant, x-component', 'লব্ধির x-উপাংশ', 'units'),
    ry: L('Resultant, y-component', 'লব্ধির y-উপাংশ', 'units'),
    magnitude: L('Resultant size', 'লব্ধির মান', 'units'),
    angle: L('Resultant direction', 'লব্ধির দিক', '°'),
  },
  incline: {
    t: time,
    weight: L('Weight', 'ওজন', 'N'),
    normal: L('Normal force', 'অভিলম্ব প্রতিক্রিয়া', 'N'),
    along: L('Weight along the slope', 'তল বরাবর ওজনের উপাংশ', 'N'),
    friction: L('Friction force', 'ঘর্ষণ বল', 'N'),
    staticLimit: L('Maximum static friction', 'সর্বোচ্চ স্থিত ঘর্ষণ', 'N'),
    net: L('Net force', 'লব্ধি বল', 'N'),
    a: L('Acceleration', 'ত্বরণ', 'm/s²'),
    slides: L('Block', 'ব্লক'),
    distance: L('Distance slid', 'পিছলে যাওয়া দূরত্ব', 'm'),
    v: L('Speed', 'দ্রুতি', 'm/s'),
  },
  pendulum: {
    t: time,
    angle: L('Angle from vertical', 'উল্লম্ব থেকে কোণ', '°'),
    omega: L('Angular velocity', 'কৌণিক বেগ', 'rad/s'),
    x: L('Sideways position', 'পাশের দিকে অবস্থান', 'm'),
    y: L('Height below the pivot', 'ঝোলানো বিন্দুর নিচে উচ্চতা', 'm'),
    total: L('Starting energy', 'শুরুর শক্তি', 'J'),
    potential: L('Potential energy', 'বিভবশক্তি', 'J'),
    ...energy,
    ...oscillation,
  },
  spring: {
    t: time,
    x: L('Displacement', 'সরণ', 'm'),
    v: L('Velocity', 'বেগ', 'm/s'),
    potential: L('Elastic potential energy', 'স্থিতিস্থাপক বিভবশক্তি', 'J'),
    ...energy,
    ...oscillation,
  },
  collision: {
    t: time,
    collided: L('Collided', 'সংঘর্ষ হয়েছে'),
    x1: L('Position of cart 1', 'গাড়ি ১-এর অবস্থান', 'm'),
    x2: L('Position of cart 2', 'গাড়ি ২-এর অবস্থান', 'm'),
    v1: L('Velocity of cart 1', 'গাড়ি ১-এর বেগ', 'm/s'),
    v2: L('Velocity of cart 2', 'গাড়ি ২-এর বেগ', 'm/s'),
    momentumBefore: L('Total momentum before', 'আগের মোট ভরবেগ', 'kg·m/s'),
    momentumAfter: L('Total momentum after', 'পরের মোট ভরবেগ', 'kg·m/s'),
    keBefore: L('Kinetic energy before', 'আগের গতিশক্তি', 'J'),
    keAfter: L('Kinetic energy after', 'পরের গতিশক্তি', 'J'),
    keLost: L('Kinetic energy lost', 'হারানো গতিশক্তি', 'J'),
    contactTime: L('Time of impact', 'সংঘর্ষের সময়', 's'),
  },
  orbit: {
    t: L('Screen time', 'পর্দার সময়', 's'),
    x: L('x position', 'x অবস্থান', MEGA),
    y: L('y position', 'y অবস্থান', MEGA),
    distance: L('Distance from centre', 'কেন্দ্র থেকে দূরত্ব', MEGA),
    speed: L('Speed', 'দ্রুতি', 'km/s'),
    kind: L('Path', 'পথ'),
    circularSpeed: L('Circular-orbit speed', 'বৃত্তাকার কক্ষপথের বেগ', 'km/s'),
    escapeSpeed: L('Escape speed', 'মুক্তিবেগ', 'km/s'),
    eccentricity: L('Eccentricity', 'উৎকেন্দ্রিকতা'),
    periodHours: L('Orbital period', 'আবর্তনকাল', 'h'),
    periapsis: L('Closest distance', 'নিকটতম দূরত্ব', MEGA),
    apoapsis: L('Farthest distance', 'দূরতম দূরত্ব', MEGA),
    screenPeriod: L('Screen time per orbit', 'পর্দায় এক আবর্তনের সময়', 's'),
  },
  'ph-indicator': {
    ph: L('pH', 'pH মান'),
    colour: L('Indicator colour', 'নির্দেশকের রং'),
    acidic: L('Acidic', 'অম্লীয়'),
    alkaline: L('Alkaline', 'ক্ষারীয়'),
  },
  titration: {
    ph: L('pH in the flask', 'ফ্লাস্কের pH'),
    colour: L('Flask colour', 'ফ্লাস্কের রং'),
    equivalenceVolume: L('End point volume', 'সমতা বিন্দুর আয়তন', 'cm³'),
  },
  'flame-test': {
    colour: L('Flame colour', 'শিখার রং'),
    line1: L('Brightest line', 'সবচেয়ে উজ্জ্বল রেখা', 'nm'),
    line2: L('Second line', 'দ্বিতীয় রেখা', 'nm'),
    line3: L('Third line', 'তৃতীয় রেখা', 'nm'),
  },
  'reaction-rate': {
    t: time,
    relativeRate: L('Rate compared with the reference', 'তুলনার অবস্থার সাপেক্ষে হার', '×'),
    halfLife: L('Half-life', 'অর্ধায়ু', 's'),
    product: L('Product formed', 'উৎপন্ন উৎপাদ', '%'),
  },
  'gas-law': {
    pressure: L('Pressure', 'চাপ', 'kPa'),
    relativeSpeed: L('Particle speed compared with 300 K', '৩০০ K-এর তুলনায় কণার দ্রুতি', '×'),
  },
  'function-grapher': {
    ...curve,
    value: L('f(x) at the point', 'বিন্দুতে f(x)-এর মান'),
    yIntercept: L('y-intercept', 'y-অক্ষছেদ'),
    vertexX: L('Vertex x', 'শীর্ষবিন্দুর x'),
    vertexY: L('Vertex y', 'শীর্ষবিন্দুর y'),
    rootCount: L('Roots in view', 'দেখানো মূলের সংখ্যা'),
    root1: L('Root 1', 'মূল ১'),
    root2: L('Root 2', 'মূল ২'),
    root3: L('Root 3', 'মূল ৩'),
  },
  derivative: {
    ...curve,
    y: L('f(x) at the point', 'বিন্দুতে f(x)-এর মান'),
    slope: L('Slope f′(x)', 'ঢাল f′(x)'),
    tangentIntercept: L('Tangent y-intercept', 'স্পর্শকের y-অক্ষছেদ'),
  },
  'riemann-area': {
    n: L('Strips', 'ফালি'),
    width: L('Strip width', 'ফালির প্রস্থ', 'units'),
    estimate: L('Estimated area', 'আনুমানিক ক্ষেত্রফল', 'sq. units'),
    exact: L('Exact area', 'প্রকৃত ক্ষেত্রফল', 'sq. units'),
    error: L('Error', 'ত্রুটি', 'sq. units'),
  },
  probability: {
    outcomes: L('Possible outcomes', 'সম্ভাব্য ফলের সংখ্যা'),
    trials: L('Trials planned', 'পরিকল্পিত পরীক্ষা'),
    done: L('Trials done', 'সম্পন্ন পরীক্ষা'),
    last: L('Last outcome', 'শেষ ফল'),
    ...outcomes,
  },
  'trig-waves': {
    angleDeg: L('Angle θ', 'কোণ θ', '°'),
    value: L('Value y', 'মান y'),
    periodDeg: L('Period', 'পর্যায়', '°'),
    max: L('Maximum', 'সর্বোচ্চ'),
    min: L('Minimum', 'সর্বনিম্ন'),
  },
};

/** Units that are words, translated for Bangla readers; symbols stay as they are. */
export function localUnit(unit: string, language: 'en' | 'bn'): string {
  if (language !== 'bn') return unit;
  return unit === 'units' ? 'একক' : unit === 'sq. units' ? 'বর্গ একক' : unit;
}

const INDICATOR_NAMES: Record<keyof typeof INDICATOR_COLOURS, [string, string]> = {
  red: ['Red', 'লাল'],
  orange: ['Orange', 'কমলা'],
  yellow: ['Yellow', 'হলুদ'],
  green: ['Green', 'সবুজ'],
  blue: ['Blue', 'নীল'],
  purple: ['Purple', 'বেগুনি'],
  pink: ['Pink', 'গোলাপি'],
  magenta: ['Magenta', 'ম্যাজেন্টা'],
  colourless: ['Colourless', 'বর্ণহীন'],
  violet: ['Violet', 'গাঢ় বেগুনি'],
};

/** The name of an indicator or flame colour the model reported as 0xRRGGBB. */
export function colourName(
  id: SimId,
  value: ObservableValue,
  language: 'en' | 'bn',
): string | null {
  if (typeof value !== 'number') return null;
  const i = language === 'bn' ? 1 : 0;
  if (id === 'flame-test') {
    const flame = Object.values(FLAMES).find((f) => f.colour === value);
    return flame ? flame.name[language] : null;
  }
  const entry = (Object.keys(INDICATOR_COLOURS) as (keyof typeof INDICATOR_COLOURS)[]).find(
    (k) => INDICATOR_COLOURS[k] === value,
  );
  return entry ? INDICATOR_NAMES[entry][i] : null;
}

/** Outcome names for the probability experiments. */
export function outcomeName(
  params: Record<string, unknown>,
  index: number,
  language: 'en' | 'bn',
): string {
  const bn = language === 'bn';
  if (params.experiment === 'coin')
    return index === 0 ? (bn ? 'হেড' : 'Heads') : bn ? 'টেল' : 'Tails';
  const n = (index + 1).toLocaleString(bn ? 'bn-BD' : 'en-US');
  return params.experiment === 'spinner' ? (bn ? `অংশ ${n}` : `Sector ${n}`) : n;
}

const yes = (v: boolean, bn: boolean) => (bn ? (v ? 'হ্যাঁ' : 'না') : v ? 'Yes' : 'No');

/** Categorical values from the library models, written as words; null when a number fits. */
export function stemReadingState(
  id: SimId,
  key: string,
  value: ObservableValue,
  language: 'en' | 'bn',
  params: Record<string, unknown> = {},
): string | null {
  const bn = language === 'bn';
  if (key === 'colour') return colourName(id, value, language);
  if (id === 'orbit' && key === 'kind' && typeof value === 'number')
    return (
      [
        ['Circular orbit', 'বৃত্তাকার কক্ষপথ'],
        ['Elliptical orbit', 'উপবৃত্তাকার কক্ষপথ'],
        ['Escapes the planet', 'গ্রহ ছেড়ে চলে যায়'],
      ] as const
    )[value]![bn ? 1 : 0];
  if (id === 'incline' && key === 'slides' && typeof value === 'boolean')
    return bn ? (value ? 'পিছলে নামে' : 'স্থির থাকে') : value ? 'Slides' : 'Holds';
  if (id === 'probability' && key === 'last')
    return value === null
      ? bn
        ? 'এখনো নেই'
        : 'None yet'
      : outcomeName(params, Number(value), language);
  // The model reports the product as a fraction; the reading is labelled in per cent.
  if (id === 'reaction-rate' && key === 'product' && typeof value === 'number')
    return formatNumber(value * 100, language, 1);
  if (typeof value === 'boolean') return yes(value, bn);
  return null;
}
