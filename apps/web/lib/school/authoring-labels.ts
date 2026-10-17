/**
 * Teacher-facing names for simulation registry codes. The lesson document keeps the codes; the
 * editor shows these words. Unknown codes (a simulation added later) fall back to a readable form.
 */
import {
  STEM_ARG_LABELS,
  STEM_PARAM_LABELS,
  STEM_PREDICATE_LABELS,
  stemSimLabel,
} from '../stem/authoring-labels';

type Lang = 'en' | 'bn';
type Pair = readonly [en: string, bn: string];

const readable = (code: string) => {
  const words = code
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const pick = (pair: Pair | undefined, code: string, lang: Lang) =>
  pair ? pair[lang === 'bn' ? 1 : 0] : readable(code);

const SIMS: Record<string, Pair> = {
  'motion-graphs': ['Motion graphs (velocity and distance)', 'গতির লেখচিত্র (বেগ ও দূরত্ব)'],
  'newton-cart': ['Force and friction cart', 'বল ও ঘর্ষণের গাড়ি'],
  'ohms-circuit': ['Electric circuit (Ohm’s law)', 'তড়িৎ বর্তনী (ও’মের সূত্র)'],
  'linear-graph': ['Straight-line graph', 'সরলরেখার লেখচিত্র'],
  'unit-circle': ['Unit circle', 'একক বৃত্ত'],
};
export const simLabel = (id: string, lang: Lang) => pick(SIMS[id] ?? stemSimLabel(id), id, lang);

const PARAMS: Record<string, Record<string, Pair>> = {
  'motion-graphs': {
    u: ['Initial velocity (m/s)', 'আদি বেগ (m/s)'],
    a: ['Acceleration (m/s²)', 'ত্বরণ (m/s²)'],
    duration: ['Duration (s)', 'সময়কাল (s)'],
  },
  'newton-cart': {
    mass: ['Mass (kg)', 'ভর (kg)'],
    force: ['Applied force (N)', 'প্রযুক্ত বল (N)'],
    muS: ['Static friction coefficient', 'স্থিত ঘর্ষণ গুণাঙ্ক'],
    muK: ['Kinetic friction coefficient', 'গতীয় ঘর্ষণ গুণাঙ্ক'],
  },
  'ohms-circuit': {
    emf: ['Source voltage (V)', 'উৎসের বিভব পার্থক্য (V)'],
    topology: ['Series or parallel', 'শ্রেণি বা সমান্তরাল সংযোগ'],
    resistors: ['Resistors (Ω)', 'রোধসমূহ (Ω)'],
  },
  'linear-graph': {
    m: ['Slope m', 'ঢাল m'],
    c: ['Intercept c', 'ছেদক c'],
  },
  'unit-circle': { angleDeg: ['Angle θ (°)', 'কোণ θ (°)'] },
};
export const paramLabel = (simId: string, key: string, lang: Lang) =>
  pick(PARAMS[simId]?.[key] ?? STEM_PARAM_LABELS[simId]?.[key], key, lang);

const PREDICATES: Record<string, Pair> = {
  stopsAt: ['Comes to rest at a distance', 'নির্দিষ্ট দূরত্বে থামে'],
  reachesSpeed: ['Reaches a final velocity', 'নির্দিষ্ট শেষ বেগে পৌঁছায়'],
  displacementEquals: ['Travels a set displacement', 'নির্দিষ্ট সরণ অতিক্রম করে'],
  justMoves: ['Push only just starts the cart', 'ধাক্কায় গাড়ি ঠিক চলতে শুরু করে'],
  accelerationEquals: ['Reaches a set acceleration', 'নির্দিষ্ট ত্বরণ পায়'],
  currentEquals: ['Circuit draws a set current', 'বর্তনীতে নির্দিষ্ট প্রবাহ'],
  powerAtLeast: ['A resistor reaches a minimum power', 'একটি রোধে ন্যূনতম ক্ষমতা'],
  lineThrough: ['Line passes through given points', 'রেখা নির্দিষ্ট বিন্দু দিয়ে যায়'],
  slopeEquals: ['Line has a set slope', 'রেখার নির্দিষ্ট ঢাল'],
  interceptEquals: ['Line has a set intercept', 'রেখার নির্দিষ্ট ছেদক'],
  angleWithin: ['Angle lies within a range', 'কোণ নির্দিষ্ট সীমার মধ্যে'],
  sinEquals: ['sin θ equals a value', 'sin θ নির্দিষ্ট মানের সমান'],
  cosEquals: ['cos θ equals a value', 'cos θ নির্দিষ্ট মানের সমান'],
  pHBetween: ['pH lies within a range', 'pH নির্দিষ্ট সীমার মধ্যে'],
  solutionColour: ['Solution turns a colour', 'দ্রবণ নির্দিষ্ট রং ধারণ করে'],
  producedGas: ['Produces a gas', 'গ্যাস উৎপন্ন হয়'],
  formedPrecipitate: ['Forms a precipitate', 'অধঃক্ষেপ তৈরি হয়'],
};
export const LAB_PREDICATES = [
  'pHBetween',
  'solutionColour',
  'producedGas',
  'formedPrecipitate',
] as const;
export const predicateLabel = (name: string, lang: Lang) =>
  pick(PREDICATES[name] ?? STEM_PREDICATE_LABELS[name], name, lang);

const TOLERANCE: Pair = ['Allowed difference (±)', 'গ্রহণযোগ্য ব্যবধান (±)'];
const ARGS: Record<string, Record<string, Pair>> = {
  stopsAt: { x: ['Stopping distance (m)', 'থামার দূরত্ব (m)'], tol: TOLERANCE },
  reachesSpeed: { v: ['Final velocity (m/s)', 'শেষ বেগ (m/s)'], tol: TOLERANCE },
  displacementEquals: { x: ['Displacement (m)', 'সরণ (m)'], tol: TOLERANCE },
  accelerationEquals: { a: ['Acceleration (m/s²)', 'ত্বরণ (m/s²)'], tol: TOLERANCE },
  currentEquals: { i: ['Current (A)', 'প্রবাহ (A)'], tol: TOLERANCE },
  powerAtLeast: {
    index: ['Resistor position (0 = first)', 'রোধের অবস্থান (০ = প্রথম)'],
    p: ['Minimum power (W)', 'ন্যূনতম ক্ষমতা (W)'],
  },
  lineThrough: {
    points: [
      'Points the line passes through, as [{"x":0,"y":1}]',
      'রেখার বিন্দু, যেমন [{"x":0,"y":1}]',
    ],
    tol: TOLERANCE,
  },
  slopeEquals: { m: ['Slope', 'ঢাল'], tol: TOLERANCE },
  interceptEquals: { c: ['Intercept', 'ছেদক'], tol: TOLERANCE },
  angleWithin: {
    min: ['Smallest angle (°)', 'ক্ষুদ্রতম কোণ (°)'],
    max: ['Largest angle (°)', 'বৃহত্তম কোণ (°)'],
  },
  sinEquals: { v: ['Value of sin θ', 'sin θ-এর মান'], tol: TOLERANCE },
  cosEquals: { v: ['Value of cos θ', 'cos θ-এর মান'], tol: TOLERANCE },
  pHBetween: { min: ['Lowest pH', 'সর্বনিম্ন pH'], max: ['Highest pH', 'সর্বোচ্চ pH'] },
  solutionColour: { colour: ['Colour (hex, e.g. #e85d9b)', 'রং (hex, যেমন #e85d9b)'] },
  producedGas: { gas: ['Gas formula (e.g. H2)', 'গ্যাসের সংকেত (যেমন H2)'] },
  formedPrecipitate: {
    formula: ['Precipitate formula (e.g. AgCl)', 'অধঃক্ষেপের সংকেত (যেমন AgCl)'],
  },
};
const EXAMPLE_LAB: Record<string, Pair> = {
  reagentIds: ['Reagents used (list of reagent codes)', 'ব্যবহৃত বিকারক (বিকারকের কোডের তালিকা)'],
  heat: ['Heat the mixture', 'মিশ্রণ উত্তপ্ত করা'],
  amounts: ['Amounts per reagent', 'প্রতিটি বিকারকের পরিমাণ'],
};
export const argLabel = (predicate: string, arg: string, lang: Lang) =>
  pick(
    ARGS[predicate]?.[arg] ??
      STEM_ARG_LABELS[predicate]?.[arg] ??
      EXAMPLE_LAB[arg] ??
      (arg === 'tol' ? TOLERANCE : undefined),
    arg,
    lang,
  );
