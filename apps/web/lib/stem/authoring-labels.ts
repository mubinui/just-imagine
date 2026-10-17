/**
 * Teacher-facing names for the library presets' parameters, tasks and task arguments. The lesson
 * editor's own table (lib/school/authoring-labels) falls back to these.
 */
import type { SimId } from '@just-imagine/stem-sims';
import { simName } from '../../components/stem/sim-format';
import { PARAMS, unitText, type Pair } from './sim-params';

const TOLERANCE: Pair = ['Allowed difference (±)', 'গ্রহণযোগ্য ব্যবধান (±)'];

/** Every library parameter, named as its control is, with its unit. */
export const STEM_PARAM_LABELS: Record<string, Record<string, Pair>> = Object.fromEntries(
  Object.entries(PARAMS).map(([simId, specs]) => [
    simId,
    Object.fromEntries(
      specs.map((p) => {
        const unit = (lang: 'en' | 'bn') =>
          'unit' in p && unitText(p.unit, lang) ? ` (${unitText(p.unit, lang)})` : '';
        return [p.id, [p.label[0] + unit('en'), p.label[1] + unit('bn')] as Pair];
      }),
    ),
  ]),
);

export const STEM_PREDICATE_LABELS: Record<string, Pair> = {
  rangeEquals: ['Lands a set distance away', 'নির্দিষ্ট দূরত্বে গিয়ে পড়ে'],
  apexEquals: ['Reaches a set maximum height', 'নির্দিষ্ট সর্বোচ্চ উচ্চতায় ওঠে'],
  flightTimeEquals: ['Stays in the air for a set time', 'নির্দিষ্ট সময় বাতাসে থাকে'],
  hitsTarget: ['Hits a target on the ground', 'ভূমিতে লক্ষ্যবস্তুতে আঘাত করে'],
  resultantEquals: ['Resultant has a set size', 'লব্ধির নির্দিষ্ট মান'],
  resultantAngleEquals: ['Resultant points in a set direction', 'লব্ধির নির্দিষ্ট দিক'],
  slides: ['Block slides or holds', 'ব্লক পিছলে নামে বা স্থির থাকে'],
  netForceEquals: ['Net force has a set size', 'লব্ধি বলের নির্দিষ্ট মান'],
  periodEquals: ['Has a set period', 'নির্দিষ্ট পর্যায়কাল'],
  maxSpeedEquals: ['Reaches a set top speed', 'নির্দিষ্ট সর্বোচ্চ দ্রুতি'],
  frequencyEquals: ['Has a set frequency', 'নির্দিষ্ট কম্পাঙ্ক'],
  finalVelocityEquals: ['A cart ends at a set velocity', 'একটি গাড়ির নির্দিষ্ট শেষ বেগ'],
  keLostEquals: ['A set amount of kinetic energy is lost', 'নির্দিষ্ট পরিমাণ গতিশক্তি হারায়'],
  orbitIs: ['Follows a chosen kind of path', 'নির্দিষ্ট ধরনের পথে চলে'],
  phEquals: ['Solution has a set pH', 'দ্রবণের নির্দিষ্ট pH'],
  indicatorShows: ['Indicator shows a colour', 'নির্দেশক নির্দিষ্ট রং দেখায়'],
  equivalenceVolumeEquals: ['End point at a set volume', 'নির্দিষ্ট আয়তনে সমতা বিন্দু'],
  endPointReached: ['Titration stopped at the end point', 'সমতা বিন্দুতে টাইট্রেশন থামানো'],
  ionIs: ['Identifies the metal ion', 'ধাতব আয়ন শনাক্ত করে'],
  fasterThanReference: ['Reacts a set number of times faster', 'নির্দিষ্ট গুণ দ্রুত বিক্রিয়া'],
  halfLifeEquals: ['Has a set half-life', 'নির্দিষ্ট অর্ধায়ু'],
  pressureEquals: ['Gas has a set pressure', 'গ্যাসের নির্দিষ্ট চাপ'],
  valueEquals: ['Curve has a set value', 'বক্ররেখার নির্দিষ্ট মান'],
  hasRoot: ['Curve crosses the x-axis at a point', 'বক্ররেখা নির্দিষ্ট বিন্দুতে x-অক্ষ ছেদ করে'],
  vertexAt: ['Vertex at a set point', 'নির্দিষ্ট বিন্দুতে শীর্ষবিন্দু'],
  slopeSign: ['Slope is positive, negative or zero', 'ঢাল ধনাত্মক, ঋণাত্মক বা শূন্য'],
  estimateEquals: ['Estimated area has a set value', 'আনুমানিক ক্ষেত্রফলের নির্দিষ্ট মান'],
  errorBelow: ['Estimate is close to the exact area', 'আনুমানিক মান প্রকৃত ক্ষেত্রফলের কাছাকাছি'],
  relativeFrequency: [
    'An outcome reaches a set frequency',
    'একটি ফলের নির্দিষ্ট আপেক্ষিক গণসংখ্যা',
  ],
  trialsAtLeast: ['Runs at least a set number of trials', 'অন্তত নির্দিষ্ট সংখ্যক পরীক্ষা'],
  amplitudeEquals: ['Wave has a set amplitude', 'তরঙ্গের নির্দিষ্ট বিস্তার'],
};

export const STEM_ARG_LABELS: Record<string, Record<string, Pair>> = {
  rangeEquals: { range: ['Range (m)', 'পাল্লা (m)'], tol: TOLERANCE },
  apexEquals: { apex: ['Maximum height (m)', 'সর্বোচ্চ উচ্চতা (m)'], tol: TOLERANCE },
  flightTimeEquals: { time: ['Flight time (s)', 'উড্ডয়নকাল (s)'], tol: TOLERANCE },
  hitsTarget: { x: ['Target distance (m)', 'লক্ষ্যের দূরত্ব (m)'], tol: TOLERANCE },
  resultantEquals: { magnitude: ['Resultant size (units)', 'লব্ধির মান (একক)'], tol: TOLERANCE },
  resultantAngleEquals: { angle: ['Resultant direction (°)', 'লব্ধির দিক (°)'], tol: TOLERANCE },
  slides: { slides: ['Should the block slide?', 'ব্লক কি পিছলে নামবে?'] },
  netForceEquals: { net: ['Net force (N)', 'লব্ধি বল (N)'], tol: TOLERANCE },
  periodEquals: {
    period: ['Period (s)', 'দোলনকাল (s)'],
    hours: ['Orbital period (h)', 'আবর্তনকাল (h)'],
    periodDeg: ['Period (°)', 'পর্যায় (°)'],
    tol: TOLERANCE,
  },
  maxSpeedEquals: { speed: ['Top speed (m/s)', 'সর্বোচ্চ দ্রুতি (m/s)'], tol: TOLERANCE },
  frequencyEquals: { frequency: ['Frequency (Hz)', 'কম্পাঙ্ক (Hz)'], tol: TOLERANCE },
  finalVelocityEquals: {
    cart: ['Which cart (1 or 2)', 'কোন গাড়ি (১ বা ২)'],
    v: ['Final velocity (m/s)', 'শেষ বেগ (m/s)'],
    tol: TOLERANCE,
  },
  keLostEquals: { joules: ['Energy lost (J)', 'হারানো শক্তি (J)'], tol: TOLERANCE },
  orbitIs: {
    kind: ['Path: circular, elliptical or escape', 'পথ: বৃত্তাকার, উপবৃত্তাকার বা মুক্তি'],
  },
  phEquals: { ph: ['pH', 'pH মান'], tol: TOLERANCE },
  indicatorShows: { colour: ['Colour name (e.g. red)', 'রঙের নাম (যেমন red)'] },
  equivalenceVolumeEquals: {
    volume: ['End point volume (cm³)', 'সমতা বিন্দুর আয়তন (cm³)'],
    tol: TOLERANCE,
  },
  endPointReached: { tol: TOLERANCE },
  ionIs: { ion: ['Metal ion (e.g. na)', 'ধাতব আয়ন (যেমন na)'] },
  fasterThanReference: {
    factor: ['Times faster than the reference', 'তুলনার অবস্থার চেয়ে কত গুণ দ্রুত'],
  },
  halfLifeEquals: { seconds: ['Half-life (s)', 'অর্ধায়ু (s)'], tol: TOLERANCE },
  pressureEquals: { kPa: ['Pressure (kPa)', 'চাপ (kPa)'], tol: TOLERANCE },
  valueEquals: { y: ['Value of y', 'y-এর মান'], tol: TOLERANCE },
  interceptEquals: { y: ['y-intercept', 'y-অক্ষছেদ'] },
  hasRoot: { x: ['Root at x', 'মূলের x'], tol: TOLERANCE },
  vertexAt: {
    x: ['Vertex x', 'শীর্ষবিন্দুর x'],
    y: ['Vertex y', 'শীর্ষবিন্দুর y'],
    tol: TOLERANCE,
  },
  slopeEquals: { slope: ['Slope', 'ঢাল'] },
  slopeSign: {
    sign: ['Sign: positive, negative or zero', 'চিহ্ন: ধনাত্মক, ঋণাত্মক বা শূন্য'],
    tol: TOLERANCE,
  },
  estimateEquals: { area: ['Area (sq. units)', 'ক্ষেত্রফল (বর্গ একক)'], tol: TOLERANCE },
  errorBelow: { tol: ['Largest allowed error', 'সর্বোচ্চ গ্রহণযোগ্য ত্রুটি'] },
  relativeFrequency: {
    outcome: ['Outcome (0 = first)', 'ফল (০ = প্রথম)'],
    value: ['Relative frequency (0 to 1)', 'আপেক্ষিক গণসংখ্যা (০ থেকে ১)'],
    tol: TOLERANCE,
  },
  trialsAtLeast: { trials: ['Smallest number of trials', 'ন্যূনতম পরীক্ষার সংখ্যা'] },
  amplitudeEquals: { amplitude: ['Amplitude', 'বিস্তার'], tol: TOLERANCE },
};

/** Library preset names, the same ones the simulation itself is announced by. */
export const stemSimLabel = (id: string): Pair | undefined =>
  Object.hasOwn(PARAMS, id) ? [simName(id as SimId, 'en'), simName(id as SimId, 'bn')] : undefined;
