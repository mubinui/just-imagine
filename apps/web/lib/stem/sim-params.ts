import type { SimId } from '@just-imagine/stem-sims';

/** [English, Bangla]. */
export type Pair = readonly [en: string, bn: string];
type Values = Record<string, unknown>;

interface ParamBase {
  id: string;
  label: Pair;
  /** Hide the control when it does not apply to the current values (e.g. bias for a die). */
  when?: (value: Values) => boolean;
}
export interface SliderParam extends ParamBase {
  kind?: 'slider';
  min: number;
  max: number;
  step: number;
  /** A plain symbol shared by both languages, or [English, Bangla] when it is a word. */
  unit: string | Pair;
  /** A logarithmic slider for values spanning several powers of ten. */
  scale?: 'log';
  /** Number entry only: a slider over this range would mean nothing (a random seed). */
  entry?: 'number';
}
export interface ChoiceOption {
  value: string | boolean;
  label: Pair;
}
export interface ChoiceParam extends ParamBase {
  kind: 'choice';
  options: readonly ChoiceOption[];
}
export type ParamSpec = SliderParam | ChoiceParam;

export const unitText = (unit: string | Pair, language: 'en' | 'bn'): string =>
  typeof unit === 'string' ? unit : unit[language === 'bn' ? 1 : 0];

const UNITS: Pair = ['units', 'একক'];
const choice = (id: string, label: Pair, options: [string | boolean, Pair][]): ChoiceParam => ({
  id,
  label,
  kind: 'choice',
  options: options.map(([value, l]) => ({ value, label: l })),
});
const slider = (
  id: string,
  label: Pair,
  min: number,
  max: number,
  step: number,
  unit: string | Pair = '',
  extra: Partial<SliderParam> = {},
): SliderParam => ({ id, label, min, max, step, unit, ...extra });

const GRAVITY = slider('gravity', ['Gravity', 'অভিকর্ষজ ত্বরণ'], 1.6, 25, 0.1, 'm/s²');

const usesC = (v: Values) => v.family !== 'linear';
const usesD = (v: Values) => v.family === 'cubic' || v.family === 'sine';
const CURVE: ParamSpec[] = [
  choice(
    'family',
    ['Function', 'ফাংশনের ধরন'],
    [
      ['linear', ['Linear', 'রৈখিক']],
      ['quadratic', ['Quadratic', 'দ্বিঘাত']],
      ['cubic', ['Cubic', 'ত্রিঘাত']],
      ['sine', ['Sine', 'সাইন']],
      ['exponential', ['Exponential', 'সূচকীয়']],
      ['logarithm', ['Logarithm', 'লগারিদমীয়']],
    ],
  ),
  slider('a', ['Coefficient a', 'সহগ a'], -10, 10, 0.1),
  slider('b', ['Coefficient b', 'সহগ b'], -10, 10, 0.1),
  slider('c', ['Coefficient c', 'সহগ c'], -10, 10, 0.1, '', { when: usesC }),
  slider('d', ['Coefficient d', 'সহগ d'], -10, 10, 0.1, '', { when: usesD }),
];

export const SIM_DEFAULTS: Record<SimId, Values> = {
  'motion-graphs': { u: 5, a: 1, duration: 10 },
  'newton-cart': { mass: 2, force: 12, muS: 0.4, muK: 0.2 },
  'ohms-circuit': { emf: 6, topology: 'series', resistors: [10, 20] },
  'linear-graph': { m: 1, c: 0 },
  'unit-circle': { angleDeg: 45 },
  projectile: { speed: 18, angle: 50, height: 5, gravity: 9.8 },
  'vector-addition': { aMagnitude: 5, aAngle: 30, bMagnitude: 4, bAngle: 110 },
  incline: { mass: 2, angle: 30, muS: 0.4, muK: 0.3, gravity: 9.8 },
  pendulum: { length: 1.5, mass: 1, angle: 30, gravity: 9.8, damping: 0.05 },
  spring: { mass: 1, k: 40, amplitude: 0.2, damping: 0.3 },
  collision: { m1: 2, m2: 1, u1: 3, u2: -1, restitution: 0.8 },
  orbit: { planetMass: 6, radius: 10, speed: 7 },
  'ph-indicator': { substance: 'hcl', concentration: 0.01, indicator: 'universal' },
  titration: {
    acid: 'hcl',
    acidConcentration: 0.1,
    acidVolume: 25,
    baseConcentration: 0.1,
    baseAdded: 20,
    indicator: 'phenolphthalein',
  },
  'flame-test': { ion: 'na' },
  'reaction-rate': { temperature: 25, concentration: 1, catalyst: false, surface: 'chips' },
  'gas-law': { amount: 1, temperature: 300, volume: 24 },
  'function-grapher': { family: 'quadratic', a: 1, b: -2, c: -3, d: 0, x: 2 },
  derivative: { family: 'cubic', a: 0.2, b: 0, c: -2, d: 0, x: 1 },
  'riemann-area': {
    family: 'quadratic',
    a: 0.5,
    b: 0,
    c: 1,
    d: 0,
    from: 0,
    to: 4,
    n: 8,
    rule: 'midpoint',
  },
  probability: { experiment: 'die', trials: 120, bias: 0.5, sectors: 4, seed: 7 },
  'trig-waves': { wave: 'sine', amplitude: 2, frequency: 1, phaseDeg: 0, angleDeg: 0 },
};

export const PARAMS: Record<SimId, ParamSpec[]> = {
  'motion-graphs': [
    slider('u', ['Initial velocity', 'আদি বেগ'], 0, 20, 0.5, 'm/s'),
    slider('a', ['Acceleration', 'ত্বরণ'], -5, 5, 0.1, 'm/s²'),
    slider('duration', ['Duration', 'সময়কাল'], 2, 20, 0.5, 's'),
  ],
  'newton-cart': [
    slider('mass', ['Mass', 'ভর'], 0.5, 10, 0.1, 'kg'),
    slider('force', ['Applied force', 'প্রযুক্ত বল'], 0, 60, 0.1, 'N'),
    slider('muS', ['Static friction coefficient', 'স্থিত ঘর্ষণ গুণাঙ্ক'], 0, 0.8, 0.01),
    slider('muK', ['Kinetic friction coefficient', 'গতীয় ঘর্ষণ গুণাঙ্ক'], 0, 0.8, 0.01),
  ],
  'ohms-circuit': [slider('emf', ['Voltage', 'বিভব পার্থক্য'], 1.5, 12, 0.1, 'V')],
  'linear-graph': [
    slider('m', ['Slope', 'ঢাল'], -10, 10, 0.1),
    slider('c', ['Intercept', 'অক্ষছেদ'], -10, 10, 0.1),
  ],
  'unit-circle': [slider('angleDeg', ['Angle', 'কোণ'], 0, 360, 1, '°')],
  projectile: [
    slider('speed', ['Launch speed', 'নিক্ষেপ বেগ'], 1, 40, 0.5, 'm/s'),
    slider('angle', ['Launch angle', 'নিক্ষেপ কোণ'], 0, 90, 1, '°'),
    slider('height', ['Launch height', 'নিক্ষেপের উচ্চতা'], 0, 50, 0.5, 'm'),
    GRAVITY,
  ],
  'vector-addition': [
    slider('aMagnitude', ['Size of A', 'A-এর মান'], 0, 10, 0.1, UNITS),
    slider('aAngle', ['Direction of A', 'A-এর দিক'], -180, 180, 1, '°'),
    slider('bMagnitude', ['Size of B', 'B-এর মান'], 0, 10, 0.1, UNITS),
    slider('bAngle', ['Direction of B', 'B-এর দিক'], -180, 180, 1, '°'),
  ],
  incline: [
    slider('mass', ['Mass', 'ভর'], 0.5, 20, 0.1, 'kg'),
    slider('angle', ['Slope angle', 'তলের নতি কোণ'], 0, 60, 1, '°'),
    slider('muS', ['Static friction coefficient', 'স্থিত ঘর্ষণ গুণাঙ্ক'], 0, 1, 0.01),
    slider('muK', ['Kinetic friction coefficient', 'গতীয় ঘর্ষণ গুণাঙ্ক'], 0, 1, 0.01),
    GRAVITY,
  ],
  pendulum: [
    slider('length', ['Length', 'দৈর্ঘ্য'], 0.2, 3, 0.05, 'm'),
    slider('mass', ['Bob mass', 'ববের ভর'], 0.1, 5, 0.1, 'kg'),
    slider('angle', ['Release angle', 'ছেড়ে দেওয়ার কোণ'], 1, 80, 1, '°'),
    GRAVITY,
    slider('damping', ['Damping', 'অবমন্দন'], 0, 1, 0.01, '1/s'),
  ],
  spring: [
    slider('mass', ['Mass', 'ভর'], 0.1, 5, 0.1, 'kg'),
    slider('k', ['Spring constant', 'স্প্রিং ধ্রুবক'], 1, 200, 1, 'N/m'),
    slider('amplitude', ['Pull distance', 'টেনে আনার দূরত্ব'], 0.01, 0.5, 0.01, 'm'),
    slider('damping', ['Damping', 'অবমন্দন'], 0, 5, 0.05, 'kg/s'),
  ],
  collision: [
    slider('m1', ['Mass of cart 1', 'গাড়ি ১-এর ভর'], 0.1, 10, 0.1, 'kg'),
    slider('u1', ['Velocity of cart 1', 'গাড়ি ১-এর বেগ'], -10, 10, 0.1, 'm/s'),
    slider('m2', ['Mass of cart 2', 'গাড়ি ২-এর ভর'], 0.1, 10, 0.1, 'kg'),
    slider('u2', ['Velocity of cart 2', 'গাড়ি ২-এর বেগ'], -10, 10, 0.1, 'm/s'),
    slider('restitution', ['Bounciness (restitution)', 'প্রত্যাবস্থান গুণাঙ্ক'], 0, 1, 0.01),
  ],
  orbit: [
    slider('planetMass', ['Planet mass', 'গ্রহের ভর'], 0.5, 20, 0.1, '×10²⁴ kg'),
    slider('radius', ['Launch distance', 'কেন্দ্র থেকে দূরত্ব'], 6.5, 50, 0.1, '×10⁶ m'),
    slider('speed', ['Launch speed', 'উৎক্ষেপণ বেগ'], 0.5, 20, 0.1, 'km/s'),
  ],
  'ph-indicator': [
    choice(
      'substance',
      ['Solution', 'দ্রবণ'],
      [
        ['hcl', ['Hydrochloric acid (HCl)', 'হাইড্রোক্লোরিক এসিড (HCl)']],
        ['ethanoic', ['Ethanoic acid (CH₃COOH)', 'ইথানয়িক এসিড (CH₃COOH)']],
        ['water', ['Pure water (H₂O)', 'বিশুদ্ধ পানি (H₂O)']],
        ['ammonia', ['Ammonia solution (NH₃)', 'অ্যামোনিয়া দ্রবণ (NH₃)']],
        ['naoh', ['Sodium hydroxide (NaOH)', 'সোডিয়াম হাইড্রোক্সাইড (NaOH)']],
      ],
    ),
    slider('concentration', ['Concentration', 'ঘনমাত্রা'], 0.0001, 1, 0.0001, 'mol/dm³', {
      scale: 'log',
    }),
    choice(
      'indicator',
      ['Indicator', 'নির্দেশক'],
      [
        ['universal', ['Universal indicator', 'সার্বজনীন নির্দেশক']],
        ['litmus', ['Litmus', 'লিটমাস']],
        ['phenolphthalein', ['Phenolphthalein', 'ফেনফথালিন']],
        ['methylOrange', ['Methyl orange', 'মিথাইল অরেঞ্জ']],
        ['bromothymol', ['Bromothymol blue', 'ব্রোমোথাইমল ব্লু']],
      ],
    ),
  ],
  titration: [
    choice(
      'acid',
      ['Acid in the flask', 'ফ্লাস্কের এসিড'],
      [
        ['hcl', ['HCl (strong)', 'HCl (তীব্র)']],
        ['ethanoic', ['CH₃COOH (weak)', 'CH₃COOH (মৃদু)']],
      ],
    ),
    slider(
      'acidConcentration',
      ['Acid concentration', 'এসিডের ঘনমাত্রা'],
      0.01,
      1,
      0.01,
      'mol/dm³',
    ),
    slider('acidVolume', ['Acid volume', 'এসিডের আয়তন'], 5, 50, 0.5, 'cm³'),
    slider(
      'baseConcentration',
      ['NaOH concentration', 'NaOH-এর ঘনমাত্রা'],
      0.01,
      1,
      0.01,
      'mol/dm³',
    ),
    slider('baseAdded', ['NaOH added', 'যোগ করা NaOH'], 0, 100, 0.1, 'cm³'),
    choice(
      'indicator',
      ['Indicator', 'নির্দেশক'],
      [
        ['phenolphthalein', ['Phenolphthalein', 'ফেনফথালিন']],
        ['methylOrange', ['Methyl orange', 'মিথাইল অরেঞ্জ']],
        ['bromothymol', ['Bromothymol blue', 'ব্রোমোথাইমল ব্লু']],
        ['universal', ['Universal indicator', 'সার্বজনীন নির্দেশক']],
      ],
    ),
  ],
  'flame-test': [
    choice(
      'ion',
      ['Metal ion', 'ধাতব আয়ন'],
      [
        ['li', ['Li⁺', 'Li⁺']],
        ['na', ['Na⁺', 'Na⁺']],
        ['k', ['K⁺', 'K⁺']],
        ['ca', ['Ca²⁺', 'Ca²⁺']],
        ['cu', ['Cu²⁺', 'Cu²⁺']],
        ['sr', ['Sr²⁺', 'Sr²⁺']],
        ['ba', ['Ba²⁺', 'Ba²⁺']],
      ],
    ),
  ],
  'reaction-rate': [
    slider('temperature', ['Temperature', 'তাপমাত্রা'], 5, 80, 1, '°C'),
    slider('concentration', ['Acid concentration', 'এসিডের ঘনমাত্রা'], 0.1, 2, 0.1, 'mol/dm³'),
    choice(
      'surface',
      ['Marble pieces', 'মার্বেলের টুকরা'],
      [
        ['lumps', ['Lumps', 'বড় টুকরা']],
        ['chips', ['Chips', 'ছোট টুকরা']],
        ['powder', ['Powder', 'গুঁড়া']],
      ],
    ),
    choice(
      'catalyst',
      ['Catalyst', 'প্রভাবক'],
      [
        [false, ['No catalyst', 'প্রভাবক নেই']],
        [true, ['With catalyst', 'প্রভাবকসহ']],
      ],
    ),
  ],
  'gas-law': [
    slider('amount', ['Amount of gas', 'গ্যাসের পরিমাণ'], 0.1, 5, 0.1, 'mol'),
    slider('temperature', ['Temperature', 'তাপমাত্রা'], 100, 800, 5, 'K'),
    slider('volume', ['Volume', 'আয়তন'], 1, 50, 0.5, 'dm³'),
  ],
  'function-grapher': [...CURVE, slider('x', ['Point x', 'বিন্দুর x'], -10, 10, 0.1)],
  derivative: [...CURVE, slider('x', ['Tangent at x', 'স্পর্শকের x'], -10, 10, 0.1)],
  'riemann-area': [
    ...CURVE,
    slider('from', ['From x', 'শুরু x'], -10, 10, 0.1),
    slider('to', ['To x', 'শেষ x'], -10, 10, 0.1),
    slider('n', ['Number of strips', 'ফালির সংখ্যা'], 1, 200, 1),
    choice(
      'rule',
      ['Strip height from', 'ফালির উচ্চতা'],
      [
        ['left', ['Left', 'বাম প্রান্ত']],
        ['midpoint', ['Midpoint', 'মধ্যবিন্দু']],
        ['right', ['Right', 'ডান প্রান্ত']],
        ['trapezoid', ['Trapezoid', 'ট্রাপিজিয়াম']],
      ],
    ),
  ],
  probability: [
    choice(
      'experiment',
      ['Experiment', 'পরীক্ষা'],
      [
        ['coin', ['Coin', 'মুদ্রা']],
        ['die', ['Die', 'ছক্কা']],
        ['spinner', ['Spinner', 'স্পিনার']],
      ],
    ),
    slider('trials', ['Number of trials', 'পরীক্ষার সংখ্যা'], 1, 10000, 1, '', { scale: 'log' }),
    slider('bias', ['Chance of heads', 'হেড পড়ার সম্ভাবনা'], 0.05, 0.95, 0.01, '', {
      when: (v) => v.experiment === 'coin',
    }),
    slider('sectors', ['Number of sectors', 'অংশের সংখ্যা'], 2, 8, 1, '', {
      when: (v) => v.experiment === 'spinner',
    }),
    slider('seed', ['Run number (random seed)', 'দৈব বীজ (রানের নম্বর)'], 0, 2 ** 31 - 1, 1, '', {
      entry: 'number',
    }),
  ],
  'trig-waves': [
    choice(
      'wave',
      ['Wave', 'তরঙ্গ'],
      [
        ['sine', ['Sine', 'সাইন']],
        ['cosine', ['Cosine', 'কোসাইন']],
      ],
    ),
    slider('amplitude', ['Amplitude A', 'বিস্তার A'], 0.1, 5, 0.1),
    slider('frequency', ['Frequency b', 'কম্পাঙ্ক b'], 0.25, 5, 0.25),
    slider('phaseDeg', ['Phase shift φ', 'দশা φ'], -180, 180, 1, '°'),
    slider('angleDeg', ['Start angle θ', 'শুরুর কোণ θ'], 0, 720, 1, '°'),
  ],
};

/** What each model assumes, shown under the readings. */
export const LIMITS: Record<SimId, Pair> = {
  'motion-graphs': [
    'Forward motion with constant acceleration while moving. Braking stops at rest, without reversing. Each graph has its own labeled scale.',
    'চলার সময় ধ্রুব ত্বরণে সামনের দিকে গতি। ব্রেক করলে বস্তু থেমে যায়, উল্টো দিকে চলে না। প্রতিটি লেখচিত্রের স্কেল আলাদা করে দেখানো আছে।',
  ],
  'newton-cart': [
    'Starts from rest with a constant horizontal push for 5 seconds. Ideal static/kinetic friction; g = 9.8 m/s². Track marks are 5 m apart; the camera follows the cart.',
    'স্থির অবস্থা থেকে ৫ সেকেন্ড ধ্রুব অনুভূমিক বল প্রয়োগ করা হয়। আদর্শ স্থিত ও গতীয় ঘর্ষণ; g = 9.8 m/s²। পথের দাগের ব্যবধান ৫ মিটার; ক্যামেরা গাড়িকে অনুসরণ করে।',
  ],
  'ohms-circuit': [
    'Ideal DC source with no internal resistance. Resistor values stay constant; heating and real bulb behaviour are not modeled.',
    'অভ্যন্তরীণ রোধবিহীন আদর্শ একমুখী তড়িৎ উৎস। রোধের মান ধ্রুব; উত্তাপ ও বাস্তব বাল্বের আচরণ এই মডেলে নেই।',
  ],
  'linear-graph': [
    'Graphs of y = mx + c. Both axes show their numeric scale; vertical lines are outside this model.',
    'y = mx + c-এর লেখচিত্র। দুই অক্ষেই সংখ্যার স্কেল দেখানো আছে; উল্লম্ব সরলরেখা এই মডেলের বাইরে।',
  ],
  'unit-circle': [
    'Angles are in degrees on a circle of radius 1. Tangent is undefined at 90° and 270°.',
    'ব্যাসার্ধ ১-এর বৃত্তে কোণ ডিগ্রিতে দেখানো হয়। ৯০° ও ২৭০° কোণে ট্যানজেন্ট অসংজ্ঞায়িত।',
  ],
  projectile: [
    'No air resistance. The ball lands on flat ground; dots mark equal time steps.',
    'বাতাসের বাধা নেই। বল সমতল ভূমিতে পড়ে; বিন্দুগুলো সমান সময় পরপর অবস্থান দেখায়।',
  ],
  'vector-addition': [
    'Angles are measured anticlockwise from the positive x-axis. Both views give the same resultant.',
    'কোণ ধনাত্মক x-অক্ষ থেকে ঘড়ির কাঁটার বিপরীত দিকে মাপা হয়। দুই পদ্ধতিতেই লব্ধি একই।',
  ],
  incline: [
    'A block released from rest on a rigid slope for 4 seconds. Ideal static and kinetic friction; force arrows share one scale.',
    'অনমনীয় তলে স্থির অবস্থা থেকে ছেড়ে দেওয়া ব্লক, ৪ সেকেন্ড। আদর্শ স্থিত ও গতীয় ঘর্ষণ; সব বলের তীর একই স্কেলে আঁকা।',
  ],
  pendulum: [
    'A point mass on a light, rigid rod released from rest. Damping turns mechanical energy into thermal energy.',
    'হালকা, অনমনীয় দণ্ডে বিন্দু ভর, স্থির অবস্থা থেকে ছেড়ে দেওয়া। অবমন্দন যান্ত্রিক শক্তিকে তাপশক্তিতে রূপান্তর করে।',
  ],
  spring: [
    'An ideal, massless spring on a frictionless track. Damping is proportional to velocity.',
    'ঘর্ষণহীন পথে আদর্শ, ভরহীন স্প্রিং। অবমন্দন বেগের সমানুপাতিক।',
  ],
  collision: [
    'Two carts on a straight, frictionless track, 6 m apart at the start. Positive velocity is to the right.',
    'সোজা, ঘর্ষণহীন পথে দুটি গাড়ি, শুরুতে ৬ মিটার দূরে। ডান দিকের বেগ ধনাত্মক।',
  ],
  orbit: [
    'A satellite launched sideways around a point-mass planet. The planet is drawn with Earth’s density; one circular orbit takes 12 seconds on screen.',
    'বিন্দু-ভর গ্রহের চারপাশে পাশের দিকে উৎক্ষিপ্ত উপগ্রহ। গ্রহটি পৃথিবীর ঘনত্ব ধরে আঁকা; পর্দায় একটি বৃত্তাকার কক্ষপথ ১২ সেকেন্ডে সম্পূর্ণ হয়।',
  ],
  'ph-indicator': [
    'Solutions at 25 °C. Strong acids and bases fully dissociate; weak ones use Ka or Kb = 1.8 × 10⁻⁵.',
    '২৫ °C তাপমাত্রায় দ্রবণ। তীব্র এসিড ও ক্ষার পুরোপুরি বিয়োজিত হয়; মৃদুগুলোর জন্য Ka বা Kb = ১.৮ × ১০⁻⁵।',
  ],
  titration: [
    'NaOH from the burette into the acid in the flask at 25 °C. The end point is where the moles of NaOH equal the moles of acid.',
    '২৫ °C তাপমাত্রায় ব্যুরেট থেকে ফ্লাস্কের এসিডে NaOH যোগ। যেখানে NaOH-এর মোল এসিডের মোলের সমান, সেটিই সমতা বিন্দু।',
  ],
  'flame-test': [
    'Textbook flame colours with each ion’s strongest visible emission lines. Real flames can be masked by sodium impurities.',
    'পাঠ্যবইয়ের শিখার রং ও প্রতিটি আয়নের সবচেয়ে উজ্জ্বল দৃশ্যমান নিঃসরণ রেখা। বাস্তবে সোডিয়ামের ভেজাল রং ঢেকে দিতে পারে।',
  ],
  'reaction-rate': [
    'Marble (CaCO₃) in acid. Rate follows the Arrhenius equation; a catalyst lowers the activation energy from 50 to 35 kJ/mol. Time runs faster than real time.',
    'এসিডে মার্বেল (CaCO₃)। হার আরহেনিয়াস সমীকরণ মেনে চলে; প্রভাবক সক্রিয়ণ শক্তি ৫০ থেকে ৩৫ kJ/mol-এ নামায়। সময় বাস্তবের চেয়ে দ্রুত চলে।',
  ],
  'gas-law': [
    'An ideal gas in a sealed cylinder. R = 8.314 J/(mol·K); particle speed grows with √T.',
    'বদ্ধ সিলিন্ডারে আদর্শ গ্যাস। R = ৮.৩১৪ J/(mol·K); কণার বেগ √T-এর সঙ্গে বাড়ে।',
  ],
  'function-grapher': [
    'Both axes run from −10 to 10. Roots and the vertex are marked when they fall inside the window.',
    'দুই অক্ষ −১০ থেকে ১০ পর্যন্ত। মূল ও শীর্ষবিন্দু জানালার ভেতরে থাকলে চিহ্নিত করা হয়।',
  ],
  derivative: [
    'The tangent touches the curve at x; its slope is the exact derivative f′(x).',
    'স্পর্শক x বিন্দুতে বক্ররেখাকে স্পর্শ করে; এর ঢাল হলো প্রকৃত অন্তরজ f′(x)।',
  ],
  'riemann-area': [
    'Area below the x-axis counts as negative. The exact value uses Simpson’s rule with 2000 strips.',
    'x-অক্ষের নিচের ক্ষেত্রফল ঋণাত্মক ধরা হয়। প্রকৃত মান ২০০০ ফালির সিম্পসন সূত্রে হিসাব করা।',
  ],
  probability: [
    'Fair dice and spinners; the coin’s chance of heads can be changed. The same run number always gives the same results.',
    'ছক্কা ও স্পিনার নিরপেক্ষ; মুদ্রার হেড পড়ার সম্ভাবনা বদলানো যায়। একই রানের নম্বর সবসময় একই ফল দেয়।',
  ],
  'trig-waves': [
    'y = A sin(bθ + φ) or A cos(bθ + φ), with θ in degrees. The point on the circle turns at the same angle as the wave.',
    'y = A sin(bθ + φ) বা A cos(bθ + φ), θ ডিগ্রিতে। বৃত্তের বিন্দু তরঙ্গের সমান কোণে ঘোরে।',
  ],
};
